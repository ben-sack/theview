import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json();
  if (!phone || !code) return NextResponse.json({ error: "Missing fields." }, { status: 400 });

  const normalized = phone.replace(/\D/g, "");
  const e164 = normalized.startsWith("1") ? `+${normalized}` : `+1${normalized}`;

  const { data: otp } = await supabase
    .from("member_otp")
    .select("code, expires_at")
    .eq("phone", e164)
    .single();

  if (!otp || otp.code !== code) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  if (new Date(otp.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 401 });
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("phone", e164)
    .eq("status", "approved")
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // Create session
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

  await supabase.from("member_sessions").insert({ contact_id: contact.id, token, expires_at: expiresAt });
  await supabase.from("member_otp").delete().eq("phone", e164);

  const res = NextResponse.json({ success: true });
  res.cookies.set("member_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
