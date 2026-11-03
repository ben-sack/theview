import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// Sends a one-off reply to someone who texted us. Only numbers that have
// texted us first can be replied to, and never anyone who's opted out.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { phone, body } = await req.json().catch(() => ({}));
  if (!phone || !body?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const { data: theirs } = await supabase
    .from("inbound_messages")
    .select("keyword_type")
    .eq("from_phone", phone)
    .order("received_at", { ascending: false });
  if (!theirs || theirs.length === 0) {
    return NextResponse.json({ error: "You can only reply to people who've texted us." }, { status: 400 });
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, sms_opted_out")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  const lastKeyword = theirs.find((m) => m.keyword_type === "stop" || m.keyword_type === "start")?.keyword_type;
  const optedOut = contact ? contact.sms_opted_out : lastKeyword === "stop";
  if (optedOut) {
    return NextResponse.json({ error: "This person has opted out of texts, so we can't reply." }, { status: 400 });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  let sid: string;
  try {
    const msg = await client.messages.create({
      body: body.trim(),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    sid = msg.sid;
  } catch (err: unknown) {
    const twilioErr = err as { code?: number };
    if (twilioErr.code === 21610) {
      if (contact) {
        await supabase.from("contacts").update({ sms_opted_out: true, sms_opt_out_source: "send_bounce" }).eq("id", contact.id);
      }
      return NextResponse.json({ error: "This person has opted out of texts, so we can't reply." }, { status: 400 });
    }
    console.error("Reply send failed:", err);
    return NextResponse.json({ error: "Failed to send. Please try again." }, { status: 500 });
  }

  const { data: reply, error } = await supabase
    .from("sms_replies")
    .insert({ to_phone: phone, contact_id: contact?.id ?? null, body: body.trim(), twilio_sid: sid })
    .select("id, body, sent_at")
    .single();
  if (error) {
    // The text did go out — just couldn't be logged.
    console.error("Reply log failed:", error);
    return NextResponse.json({ reply: { id: sid, body: body.trim(), sent_at: new Date().toISOString() } });
  }
  return NextResponse.json({ reply });
}
