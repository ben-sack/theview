import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("door_auth")?.value === "true";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { eventId } = await params;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, date, location, capacity")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: rsvps, error } = await supabase
    .from("rsvps")
    .select("id, party_size, checked_in, checked_in_at, contacts(name, ig_handle)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sorted = (rsvps ?? []).sort((a, b) => {
    const nameA = (Array.isArray(a.contacts) ? a.contacts[0] : a.contacts)?.name ?? "";
    const nameB = (Array.isArray(b.contacts) ? b.contacts[0] : b.contacts)?.name ?? "";
    return nameA.localeCompare(nameB);
  });

  return NextResponse.json({ event, rsvps: sorted });
}
