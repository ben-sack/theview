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

  const { id: eventId } = await params;
  const { waitlist_id } = await req.json();

  const { data: entry, error: fetchError } = await supabase
    .from("waitlist")
    .select("*, contacts(id, name, phone, sms_opted_out), events(title, date, location)")
    .eq("id", waitlist_id)
    .single();

  if (fetchError || !entry) {
    return NextResponse.json({ error: "Waitlist entry not found." }, { status: 404 });
  }

  const contact = Array.isArray(entry.contacts) ? entry.contacts[0] : entry.contacts as { id: string; name: string; phone: string | null; sms_opted_out: boolean };
  const event = Array.isArray(entry.events) ? entry.events[0] : entry.events as { title: string; date: string; location: string | null };

  const { error: rsvpError } = await supabase
    .from("rsvps")
    .upsert(
      { event_id: eventId, contact_id: entry.contact_id, party_size: entry.party_size },
      { onConflict: "event_id,contact_id" }
    );

  if (rsvpError) {
    return NextResponse.json({ error: rsvpError.message }, { status: 500 });
  }

  await supabase.from("waitlist").delete().eq("id", waitlist_id);

  if (contact?.phone && !contact.sms_opted_out) {
    try {
      const firstName = contact.name.split(" ")[0];
      const eventDate = new Date(event.date).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles",
      });

      const { data: setting } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "waitlist_sms_template")
        .single();

      const defaultTemplate = "Good news, {name}! A spot just opened up at The View for {event} on {date} at {location}. You're officially on the list - see you there.";
      const template = setting?.value || defaultTemplate;

      const body = template
        .replace(/\{name\}/gi, firstName)
        .replace(/\{event\}/gi, event.title)
        .replace(/\{date\}/gi, eventDate)
        .replace(/\{location\}/gi, event.location?.trim() || "the venue");

      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `${body}\n\nReply STOP to opt out`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: contact.phone,
      });
    } catch (err) {
      console.error("SMS failed:", err);
    }
  }

  return NextResponse.json({ success: true });
}
