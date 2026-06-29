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
  const { name, email, phone, ig_handle, referred_by } = body;

  if (!name || !email || !phone || !ig_handle) {
    return NextResponse.json({ error: "Please fill out all required fields." }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);

  const { error } = await supabase.from("contacts").insert([
    {
      name,
      email,
      phone: normalizedPhone,
      ig_handle,
      referred_by: referred_by || null,
      status: "pending",
    },
  ]);

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
