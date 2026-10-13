import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";
import { DEFAULT_SIGNUP_APPROVED_TEMPLATE, eventHasEnded, fillSignupApprovedTemplate } from "@/lib/eventSignup";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

type SignupEvent = { id: string; title: string; date: string; end_time: string | null };

// Puts a newly approved contact onto the guest list of every still-upcoming
// event they signed up for through a public event page, then clears those
// signups. Returns the events they were added to, soonest first.
async function addToSignupEvents(contactId: string): Promise<SignupEvent[]> {
  const { data: signups, error } = await supabase
    .from("event_signups")
    .select("event_id, events(id, title, date, end_time)")
    .eq("contact_id", contactId);

  if (error) {
    console.error("Failed to load event signups:", error.message);
    return [];
  }

  const events = (signups ?? [])
    .map((s) => (Array.isArray(s.events) ? s.events[0] : s.events) as SignupEvent | null)
    .filter((e): e is SignupEvent => !!e && !eventHasEnded(e))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const added: SignupEvent[] = [];
  for (const event of events) {
    const { error: rsvpError } = await supabase
      .from("rsvps")
      .upsert({ event_id: event.id, contact_id: contactId, party_size: 1 }, { onConflict: "event_id,contact_id" });
    if (rsvpError) {
      console.error("Failed to add approved signup to list:", rsvpError.message);
      continue;
    }
    await supabase.from("waitlist").delete().eq("event_id", event.id).eq("contact_id", contactId);
    added.push(event);
  }

  await supabase.from("event_signups").delete().eq("contact_id", contactId);
  return added;
}

async function sendApprovalSms(contactId: string, phone: string, name: string, listEvent?: SignupEvent) {
  // Someone approved off an event signup page gets one combined
  // "welcome + you're on the list" text instead of the plain welcome.
  const key = listEvent ? "signup_approved_sms_template" : "sms_template";
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const template = data?.value || (listEvent ? DEFAULT_SIGNUP_APPROVED_TEMPLATE : null);
  if (!template) return;

  const body = listEvent
    ? fillSignupApprovedTemplate(template, name, listEvent)
    : template.replace(/\{name\}/gi, name.split(" ")[0]);
  const message = `${body}\n\nReply STOP to opt out`;

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  } catch (err: unknown) {
    const twilioErr = err as { code?: number };
    if (twilioErr.code === 21610) {
      await supabase.from("contacts").update({ sms_opted_out: true, sms_opt_out_source: "send_bounce" }).eq("id", contactId);
    }
    throw err;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, rejection_reason, notes, gender_override } = body;

  // Notes-only update
  if (notes !== undefined && !status) {
    const { error } = await supabase.from("contacts").update({ notes }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Gender-override-only update
  if (gender_override !== undefined && !status) {
    if (!["male", "female", "unsure"].includes(gender_override)) {
      return NextResponse.json({ error: "Invalid gender value." }, { status: 400 });
    }
    const { error } = await supabase.from("contacts").update({ gender_override }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: contact, error: fetchError } = await supabase
    .from("contacts")
    .select("name, phone, sms_opted_out")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const updateData: Record<string, string> = { status };
  if (status === "rejected" && rejection_reason) {
    updateData.rejection_reason = rejection_reason;
  }

  const { error } = await supabase
    .from("contacts")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const addedEvents = status === "approved" ? await addToSignupEvents(id) : [];
  if (status === "rejected") {
    await supabase.from("event_signups").delete().eq("contact_id", id);
  }

  if (status === "approved" && contact?.phone && !contact.sms_opted_out) {
    try {
      await sendApprovalSms(id, contact.phone, contact.name, addedEvents[0]);
    } catch (smsError) {
      console.error("SMS failed:", smsError);
    }
  }

  return NextResponse.json({ success: true, addedToEvents: addedEvents.map((e) => e.title) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: deletedContact } = await supabase
    .from("contacts")
    .select("name")
    .eq("id", id)
    .single();

  if (deletedContact?.name) {
    const nameKey = deletedContact.name.trim().toLowerCase();

    const { data: referredContacts } = await supabase
      .from("contacts")
      .select("id, referred_by")
      .not("referred_by", "is", null)
      .range(0, 9999);

    const matchingIds = (referredContacts ?? [])
      .filter((c) => c.referred_by?.trim().toLowerCase() === nameKey)
      .map((c) => c.id);

    if (matchingIds.length > 0) {
      await supabase.from("contacts").update({ referred_by: null }).in("id", matchingIds);
    }
  }

  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
