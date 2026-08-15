import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveGender } from "@/lib/estimateGender";

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
    .select("*, contacts(id, name, email, phone, ig_handle, gender_override)")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (rsvpError) {
    return NextResponse.json({ error: rsvpError.message }, { status: 500 });
  }

  const { data: textBlasts, error: textBlastsError } = await supabase
    .from("event_text_blasts")
    .select("contact_id")
    .eq("event_id", id);

  if (textBlastsError) {
    return NextResponse.json({ error: textBlastsError.message }, { status: 500 });
  }

  const textBlastSentIds = (textBlasts ?? []).map((t) => t.contact_id);

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
    .order("name", { ascending: true })
    .range(0, 9999);

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
  const rsvpedIds = new Set((rsvps ?? []).map((r) => r.contact_id).filter(Boolean));
  const inviteCandidates = (candidates ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    invited: invitedIds.has(c.id) || rsvpedIds.has(c.id),
    rsvped: rsvpedIds.has(c.id),
  }));

  const genderBreakdown = { male: 0, female: 0, unsure: 0 };
  for (const r of rsvps ?? []) {
    const contact = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
    const name = contact?.name ?? r.guest_name;
    const gender = resolveGender(name, contact?.gender_override);
    genderBreakdown[gender]++;
  }

  return NextResponse.json({ event, rsvps: rsvps ?? [], waitlist: waitlist ?? [], inviteCandidates, genderBreakdown, textBlastSentIds });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { title, date, end_time, capacity, location, city, partners, allow_guests } = await req.json();

  const { error } = await supabase
    .from("events")
    .update({ title, date, end_time: end_time || null, capacity, location, city, partners, allow_guests })
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
