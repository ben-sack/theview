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
  const { message_template } = await req.json().catch(() => ({}));

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, name, phone")
    .eq("status", "approved")
    .eq("sms_opted_out", false)
    .not("phone", "is", null);

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const defaultTemplate = `Hey {name}, the next one is happening. ${event.title} · ${eventDate}${event.location ? ` · ${event.location}` : ""}. Secure your spot before it fills up: {rsvp_link}`;
  const template = message_template?.trim() || defaultTemplate;

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let sent = 0;
  const failures: string[] = [];

  for (const contact of contacts ?? []) {
    const firstName = contact.name.split(" ")[0];
    const rsvpLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://theview.la"}/rsvp/${id}?c=${contact.id}`;
    const message = template
      .replace(/\{name\}/gi, firstName)
      .replace(/\{rsvp_link\}/gi, rsvpLink);

    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: contact.phone!,
      });
      sent++;
    } catch (err: unknown) {
      const twilioErr = err as { code?: number };
      if (twilioErr.code === 21610) {
        await supabase.from("contacts").update({ sms_opted_out: true }).eq("id", contact.id);
      }
      failures.push(contact.name);
    }
  }

  return NextResponse.json({ sent, failures });
}
