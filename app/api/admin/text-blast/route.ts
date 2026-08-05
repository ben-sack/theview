import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { count: totalCount, error: totalError } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .not("phone", "is", null);

  const { count: optedOutCount, error: optedOutError } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .eq("sms_opted_out", true)
    .not("phone", "is", null);

  if (totalError || optedOutError) {
    return NextResponse.json({ error: "Failed to fetch counts." }, { status: 500 });
  }

  const total = totalCount ?? 0;
  const optedOut = optedOutCount ?? 0;

  return NextResponse.json({ memberCount: total - optedOut, optedOutCount: optedOut });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, phone, name")
    .eq("status", "approved")
    .eq("sms_opted_out", false)
    .not("phone", "is", null)
    .range(0, 9999);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let sent = 0;
  const failures: string[] = [];

  for (const contact of contacts ?? []) {
    try {
      await client.messages.create({
        body: `${message}\n\nReply STOP to opt out`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: contact.phone!,
      });
      sent++;
    } catch (err: unknown) {
      const twilioErr = err as { code?: number };
      if (twilioErr.code === 21610) {
        await supabase
          .from("contacts")
          .update({ sms_opted_out: true })
          .eq("id", contact.id);
      }
      failures.push(contact.name);
    }
  }

  return NextResponse.json({ sent, failures });
}
