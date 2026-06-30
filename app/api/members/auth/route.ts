import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "Phone number required." }, { status: 400 });

  // Check portal is enabled
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "members_portal_enabled")
    .single();

  if (setting?.value !== "true") {
    return NextResponse.json({ error: "Member portal is not currently available." }, { status: 403 });
  }

  // Normalize phone
  const normalized = phone.replace(/\D/g, "");
  const e164 = normalized.startsWith("1") ? `+${normalized}` : `+1${normalized}`;

  // Look up approved contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("phone", e164)
    .eq("status", "approved")
    .single();

  if (!contact) {
    return NextResponse.json({ error: "No approved member found with that number." }, { status: 404 });
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await supabase
    .from("member_otp")
    .upsert({ phone: e164, code, expires_at: expiresAt }, { onConflict: "phone" });

  const firstName = contact.name.split(" ")[0];

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Hey ${firstName}, your The View login code is: ${code}\n\nExpires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: e164,
    });
  } catch (err) {
    console.error("SMS failed:", err);
    // Code is still saved — allow login via manual code lookup if SMS fails
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("member_session", "", { maxAge: 0, path: "/" });
  return res;
}
