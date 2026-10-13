import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { formatEventDateShort } from "@/lib/messageFormat";
import twilio from "twilio";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// Manually puts approved members straight onto an event's guest list
// (bypassing the RSVP link and capacity check — the admin is choosing to
// add them), optionally texting each one a "you're on the list" message.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { contact_ids, notify, message } = await req.json().catch(() => ({}));

  if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
    return NextResponse.json({ error: "Select at least one member to add." }, { status: 400 });
  }
  if (notify && !message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("title, date")
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, name, phone, sms_opted_out")
    .eq("status", "approved")
    .in("id", contact_ids);

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("rsvps")
    .select("contact_id")
    .eq("event_id", id)
    .in("contact_id", contact_ids);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  // Already on the list = skipped entirely, so they never get a duplicate text.
  const alreadyOnList = new Set((existing ?? []).map((r) => r.contact_id));
  const toAdd = (contacts ?? []).filter((c) => !alreadyOnList.has(c.id));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from("rsvps")
      .upsert(
        toAdd.map((c) => ({ event_id: id, contact_id: c.id, party_size: 1 })),
        { onConflict: "event_id,contact_id" }
      );
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Anyone who was waiting on the waitlist is now on the real list.
    await supabase
      .from("waitlist")
      .delete()
      .eq("event_id", id)
      .in("contact_id", toAdd.map((c) => c.id));
  }

  let texted = 0;
  const failures: string[] = [];
  const notTextable: string[] = [];

  if (notify) {
    const template = message
      .replace(/\{event\}/gi, event.title)
      .replace(/\{date\}/gi, formatEventDateShort(new Date(event.date)));

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Bounded concurrent batches — see the RSVP Invite Blast route.
    const BATCH_SIZE = 10;
    for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
      const batch = toAdd.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (contact) => {
          if (!contact.phone || contact.sms_opted_out) {
            notTextable.push(contact.name);
            return;
          }
          const firstName = contact.name.split(" ")[0];
          try {
            await client.messages.create({
              body: `${template.replace(/\{name\}/gi, firstName)}\n\nReply STOP to opt out`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: contact.phone,
            });
            texted++;
          } catch (err: unknown) {
            const twilioErr = err as { code?: number };
            if (twilioErr.code === 21610) {
              await supabase.from("contacts").update({ sms_opted_out: true, sms_opt_out_source: "send_bounce" }).eq("id", contact.id);
            }
            failures.push(contact.name);
          }
        })
      );
    }
  }

  return NextResponse.json({
    added: toAdd.length,
    skipped: (contacts ?? []).length - toAdd.length,
    texted,
    failures,
    notTextable,
  });
}
