import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, date, location, partners, capacity, allow_guests")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { count } = await supabase
    .from("rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return NextResponse.json({ event, rsvp_count: count ?? 0 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const { contact_id, party_size } = await req.json();

  if (!contact_id) {
    return NextResponse.json({ error: "Invalid RSVP link." }, { status: 400 });
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, name, status")
    .eq("id", contact_id)
    .single();

  if (contactError || !contact || contact.status !== "approved") {
    return NextResponse.json({ error: "Not authorized to RSVP." }, { status: 403 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, capacity, allow_guests")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { count: currentRsvps } = await supabase
    .from("rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if ((currentRsvps ?? 0) >= event.capacity) {
    return NextResponse.json({ error: "This event is at capacity." }, { status: 409 });
  }

  const size = event.allow_guests ? Math.min(Math.max(party_size ?? 1, 1), 3) : 1;

  const { error } = await supabase
    .from("rsvps")
    .upsert({ event_id: eventId, contact_id, party_size: size }, { onConflict: "event_id,contact_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, name: contact.name });
}
