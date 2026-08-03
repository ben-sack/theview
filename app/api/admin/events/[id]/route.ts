import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const { data: rsvps, error: rsvpError } = await supabase
    .from("rsvps")
    .select("*, contacts(name, email, phone, ig_handle)")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (rsvpError) {
    return NextResponse.json({ error: rsvpError.message }, { status: 500 });
  }

  const { data: waitlist, error: wlError } = await supabase
    .from("waitlist")
    .select("*, contacts(name, email, phone, ig_handle)")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (wlError) {
    return NextResponse.json({ error: wlError.message }, { status: 500 });
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("status", "approved")
    .eq("sms_opted_out", false)
    .not("phone", "is", null)
    .order("name", { ascending: true });

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  const { data: invites, error: invitesError } = await supabase
    .from("event_invites")
    .select("contact_id")
    .eq("event_id", id);

  if (invitesError) {
    return NextResponse.json({ error: invitesError.message }, { status: 500 });
  }

  const invitedIds = new Set((invites ?? []).map((i) => i.contact_id));
  for (const r of rsvps ?? []) {
    if (r.contact_id) invitedIds.add(r.contact_id);
  }
  const inviteCandidates = (candidates ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    invited: invitedIds.has(c.id),
  }));

  return NextResponse.json({ event, rsvps: rsvps ?? [], waitlist: waitlist ?? [], inviteCandidates });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { title, date, end_time, capacity, location, partners, allow_guests } = await req.json();

  const { error } = await supabase
    .from("events")
    .update({ title, date, end_time: end_time || null, capacity, location, partners, allow_guests })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
