import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    email,
    phone,
    event_type,
    event_date,
    guest_count,
    time_block,
    notes,
  } = body;

  if (
    !name?.trim() ||
    !email?.trim() ||
    !phone?.trim() ||
    !event_type ||
    !event_date ||
    !guest_count ||
    !time_block?.trim() ||
    !notes?.trim()
  ) {
    return NextResponse.json({ error: "Please fill out all required fields." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .insert([
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        event_type,
        event_date,
        guest_count: Number(guest_count),
        time_block: time_block.trim(),
        notes: notes.trim(),
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }

  const { data: settingRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "booking_notification_phone")
    .single();

  const notifyPhone = settingRow?.value;
  if (notifyPhone) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `New booking request: ${name} — ${event_type}, ${event_date}, ${guest_count} guests. Check the admin Bookings tab.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: notifyPhone,
      });
    } catch (err) {
      console.error("Booking notification SMS failed:", err);
    }
  }

  return NextResponse.json({ success: true, id: data.id });
}
