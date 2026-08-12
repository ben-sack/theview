import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabase } from "@/lib/supabase";

const STOP_KEYWORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];
const START_KEYWORDS = ["start", "yes", "unstop"];
const HELP_KEYWORDS = ["help", "info"];

const HELP_REPLY = "The View: For help, contact info@theview.la. Msg&Data rates may apply. Reply STOP to unsubscribe.";

function twiml(message?: string) {
  const body = message ? `<Message>${message}</Message>` : "";
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const paramsObj = Object.fromEntries(params.entries());

  const signature = req.headers.get("X-Twilio-Signature") ?? "";
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://theview.la"}/api/twilio/inbound`;
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    paramsObj
  );

  if (!isValid) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = paramsObj.From ?? "";
  const body = (paramsObj.Body ?? "").trim();
  const normalized = body.toLowerCase();

  let keywordType: "stop" | "start" | "help" | null = null;
  if (STOP_KEYWORDS.includes(normalized)) keywordType = "stop";
  else if (START_KEYWORDS.includes(normalized)) keywordType = "start";
  else if (HELP_KEYWORDS.includes(normalized)) keywordType = "help";

  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("phone", from)
    .single();

  if (keywordType === "stop" && contact) {
    await supabase.from("contacts").update({ sms_opted_out: true }).eq("id", contact.id);
  } else if (keywordType === "start" && contact) {
    await supabase.from("contacts").update({ sms_opted_out: false }).eq("id", contact.id);
  }

  await supabase.from("inbound_messages").insert([
    {
      contact_id: contact?.id ?? null,
      from_phone: from,
      body,
      keyword_type: keywordType,
    },
  ]);

  if (keywordType === "help") {
    return twiml(HELP_REPLY);
  }

  return twiml();
}
