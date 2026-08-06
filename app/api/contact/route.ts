import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function normalizePhone(raw: string): string {
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { first_name, last_name, email, phone, ig_handle, referred_by, sms_opt_in } = body;

  if (!first_name?.trim() || !last_name?.trim() || !email || !phone || !ig_handle) {
    return NextResponse.json({ error: "Please fill out all required fields." }, { status: 400 });
  }

  const name = `${first_name.trim()} ${last_name.trim()}`;

  if (typeof sms_opt_in !== "boolean") {
    return NextResponse.json({ error: "Please let us know if we can text you." }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);

  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .or(`email.eq.${email},phone.eq.${normalizedPhone}`)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: "We already have your information on file." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert([
      {
        name,
        email,
        phone: normalizedPhone,
        ig_handle,
        referred_by: referred_by || null,
        status: "pending",
        sms_opted_out: !sms_opt_in,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
