import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("door_auth")?.value === "true";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { eventId } = await params;
  const { name, party_size } = await req.json().catch(() => ({}));

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const size = Math.min(Math.max(Number(party_size) || 1, 1), 6);

  const { data, error } = await supabase
    .from("rsvps")
    .insert({ event_id: eventId, contact_id: null, guest_name: name.trim(), party_size: size })
    .select("id, party_size, checked_in, checked_in_at, guest_name, contacts(name, ig_handle)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rsvp: data });
}
