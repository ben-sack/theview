import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { formatDoorTime, formatEventDateShort } from "@/lib/messageFormat";
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
  const { message, contact_ids } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("title, date, location")
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: rsvps, error } = await supabase
    .from("rsvps")
    .select("contacts(id, name, phone, sms_opted_out)")
    .eq("event_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const recipientIds: Set<string> | null = Array.isArray(contact_ids) && contact_ids.length > 0
    ? new Set(contact_ids)
    : null;

  const eventDateTime = new Date(event.date);
  const messageWithEventInfo = message
    .replace(/\{event\}/gi, event.title)
    .replace(/\{date\}/gi, formatEventDateShort(eventDateTime))
    .replace(/\{door_time\}/gi, formatDoorTime(eventDateTime))
    .replace(/\{address\}/gi, event.location || "the venue");

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let sent = 0;
  const failures: string[] = [];

  const eligible = (rsvps ?? [])
    .map((rsvp) => (Array.isArray(rsvp.contacts) ? rsvp.contacts[0] : rsvp.contacts) as { id: string; name: string; phone: string | null; sms_opted_out: boolean } | null)
    .filter((contact): contact is { id: string; name: string; phone: string; sms_opted_out: boolean } =>
      !!contact?.phone && !contact.sms_opted_out && (!recipientIds || recipientIds.has(contact.id))
    );

  // Sent concurrently in bounded batches, not fully sequential — see the
  // RSVP Invite Blast route for the incident this pattern is fixing.
  const BATCH_SIZE = 10;
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (contact) => {
        try {
          const firstName = contact.name.split(" ")[0];
          const personalized = messageWithEventInfo.replace(/\{name\}/gi, firstName);
          await client.messages.create({
            body: `${personalized}\n\nReply STOP to opt out`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: contact.phone,
          });
          sent++;
          await supabase
            .from("event_text_blasts")
            .upsert({ event_id: id, contact_id: contact.id, sent_at: new Date().toISOString() }, { onConflict: "event_id,contact_id" });
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

  return NextResponse.json({ sent, failures });
}
