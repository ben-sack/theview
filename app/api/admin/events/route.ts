import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: events, error } = await supabase
    .from("events")
    .select("*, rsvps(party_size, checked_in), waitlist(id)")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (events ?? []).map((e) => ({
    ...e,
    rsvp_count: (e.rsvps ?? []).reduce((sum: number, r: { party_size: number }) => sum + r.party_size, 0),
    checked_in_count: (e.rsvps ?? []).filter((r: { checked_in: boolean }) => r.checked_in).reduce((sum: number, r: { party_size: number }) => sum + r.party_size, 0),
    waitlist_count: (e.waitlist ?? []).length,
    rsvps: undefined,
    waitlist: undefined,
  }));

  return NextResponse.json({ events: formatted });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { title, date, end_time, capacity, location, partners, allow_guests } = await req.json();

  if (!title || !date || !capacity) {
    return NextResponse.json({ error: "Title, date, and capacity are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert([{ title, date, end_time: end_time || null, capacity, location, partners, allow_guests: allow_guests ?? false }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
