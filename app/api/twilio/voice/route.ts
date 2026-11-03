import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

// What callers to our toll-free number hear. We don't take calls — this
// points them to texting or email, then hangs up. The email is spelled out
// so the voice reads it naturally.
const MESSAGE =
  "You've reached The View. For the fastest response, text this number, or email info at the view dot L.A. Thanks!";
const VOICE = "Polly.Joanna-Neural";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const paramsObj = Object.fromEntries(new URLSearchParams(rawBody).entries());

  const signature = req.headers.get("X-Twilio-Signature") ?? "";
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://theview.la"}/api/twilio/voice`;
  if (!twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, paramsObj)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const response = new twilio.twiml.VoiceResponse();
  response.pause({ length: 1 });
  response.say({ voice: VOICE }, MESSAGE);
  response.hangup();

  return new NextResponse(response.toString(), { headers: { "Content-Type": "text/xml" } });
}
