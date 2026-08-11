import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { message_template, contact_ids } = await req.json().catch(() => ({}));

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  let contactsQuery = supabase
    .from("contacts")
    .select("id, name, phone")
    .eq("status", "approved")
    .eq("sms_opted_out", false)
    .not("phone", "is", null);

  if (Array.isArray(contact_ids) && contact_ids.length > 0) {
    contactsQuery = contactsQuery.in("id", contact_ids);
  }

  const { data: contacts, error: contactsError } = await contactsQuery.range(0, 9999);

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });

  const defaultTemplate = `Hey {name}, the next event at The View is happening. ${event.title} - ${eventDate}${event.location ? ` - ${event.location}` : ""}. Secure your spot before it fills up: {rsvp_link}`;
  const template = message_template?.trim() || defaultTemplate;

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let sent = 0;
  const failures: string[] = [];
  const sentContactIds: string[] = [];

  for (const contact of contacts ?? []) {
    const firstName = contact.name.split(" ")[0];
    const rsvpLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://theview.la"}/rsvp/${id}?c=${contact.id}`;
    const message = `${template
      .replace(/\{name\}/gi, firstName)
      .replace(/\{rsvp_link\}/gi, rsvpLink)}\n\nReply STOP to opt out`;

    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: contact.phone!,
      });
      sent++;
      sentContactIds.push(contact.id);
    } catch (err: unknown) {
      const twilioErr = err as { code?: number };
      if (twilioErr.code === 21610) {
        await supabase.from("contacts").update({ sms_opted_out: true }).eq("id", contact.id);
      }
      failures.push(contact.name);
    }
  }

  if (sentContactIds.length > 0) {
    const { error: inviteTrackingError } = await supabase
      .from("event_invites")
      .upsert(
        sentContactIds.map((contact_id) => ({ event_id: id, contact_id })),
        { onConflict: "event_id,contact_id" }
      );
    if (inviteTrackingError) {
      console.error("Failed to record event_invites (texts still sent successfully):", inviteTrackingError.message);
    }
  }

  return NextResponse.json({ sent, failures });
}
