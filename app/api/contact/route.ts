import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, ig_handle, occupation, referred_by } = body;

  if (!name || !email || !phone || !ig_handle || !occupation) {
    return NextResponse.json({ error: "Please fill out all required fields." }, { status: 400 });
  }

  const { error } = await supabase.from("contacts").insert([
    {
      name,
      email,
      phone,
      ig_handle,
      occupation,
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
