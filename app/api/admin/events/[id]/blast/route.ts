import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getRsvpShortLink } from "@/lib/shortLink";
import { formatEventDateShort } from "@/lib/messageFormat";
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

  const eventDate = formatEventDateShort(new Date(event.date));

  const defaultTemplate = `Hey {name}, you're invited to {event} on {date}. Spots are limited — RSVP here to claim yours: {rsvp_link}`;
  const template = (message_template?.trim() || defaultTemplate)
    .replace(/\{event\}/gi, event.title)
    .replace(/\{date\}/gi, eventDate);

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let sent = 0;
  const failures: string[] = [];

  // Sent concurrently in bounded batches (not fully sequential) so large
  // recipient lists have a real chance of finishing before the host
  // platform's function-execution time limit kills the request. Each
  // successful send records its own event_invites row immediately —
  // NOT batched until the end — so a mid-run timeout can never again
  // silently lose invite-tracking for people who were actually texted.
  const BATCH_SIZE = 10;
  const allContacts = contacts ?? [];

  for (let i = 0; i < allContacts.length; i += BATCH_SIZE) {
    const batch = allContacts.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (contact) => {
        const firstName = contact.name.split(" ")[0];
        const rsvpLink = await getRsvpShortLink(id, contact.id);
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
          const { error: inviteTrackingError } = await supabase
            .from("event_invites")
            .upsert({ event_id: id, contact_id: contact.id }, { onConflict: "event_id,contact_id" });
          if (inviteTrackingError) {
            console.error("Failed to record event_invites (text still sent successfully):", inviteTrackingError.message);
          }
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
