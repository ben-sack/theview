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
    .select("*, contacts(name, email, phone, ig_handle, referred_by)")
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

  // Every approved member, for "Add to List" — unlike inviteCandidates this
  // includes people without a phone / opted out, since adding someone to
  // the list doesn't require texting them.
  const { data: members, error: membersError } = await supabase
    .from("contacts")
    .select("id, name, ig_handle, phone, sms_opted_out")
    .eq("status", "approved")
    .order("name", { ascending: true })
    .range(0, 9999);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const waitlistedIds = new Set((waitlist ?? []).map((w) => w.contact_id));
  const addCandidates = (members ?? [])
    .filter((m) => !rsvpedIds.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.name,
      ig_handle: m.ig_handle,
      textable: !!m.phone && !m.sms_opted_out,
      waitlisted: waitlistedIds.has(m.id),
    }));

  // Pending people who asked to join this event's list through its public
  // signup page. Tolerates the table not existing yet.
  const { data: signups } = await supabase
    .from("event_signups")
    .select("id, created_at, contacts(id, name, ig_handle, status)")
    .eq("event_id", id)
    .order("created_at", { ascending: true });
  const pendingSignups = (signups ?? [])
    .map((s) => ({ ...s, contacts: Array.isArray(s.contacts) ? s.contacts[0] : s.contacts }))
    .filter((s) => s.contacts?.status === "pending");

  // Visits/submissions on the public signup page, per link (TikTok bio etc).
  // Tolerates the table not existing yet.
  const { data: linkEvents } = await supabase
    .from("signup_link_events")
    .select("source, kind")
    .eq("event_id", id)
    .range(0, 99999);
  const linkStats: Record<string, { visits: number; submits: number }> = {};
  for (const e of linkEvents ?? []) {
    const s = (linkStats[e.source] ??= { visits: 0, submits: 0 });
    if (e.kind === "visit") s.visits++;
    else if (e.kind === "submit") s.submits++;
  }

  const genderBreakdown = { male: 0, female: 0, unsure: 0 };
  for (const r of rsvps ?? []) {
    const contact = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
    const name = contact?.name ?? r.guest_name;
    const gender = resolveGender(name, contact?.gender_override);
    genderBreakdown[gender]++;
  }

  return NextResponse.json({ event, rsvps: rsvps ?? [], waitlist: waitlist ?? [], inviteCandidates, addCandidates, pendingSignups, linkStats, genderBreakdown, textBlastSentIds });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { title, date, end_time, capacity, location, city, partners, allow_guests, announcement_blurb } = await req.json();

  const { error } = await supabase
    .from("events")
    .update({ title, date, end_time: end_time || null, capacity, location, city, partners, allow_guests, announcement_blurb: announcement_blurb || null })
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
