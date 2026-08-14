import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("member_session")?.value;
  if (!token) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { data: session } = await supabase
    .from("member_sessions")
    .select("contact_id, expires_at")
    .eq("token", token)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, email, phone, ig_handle, referred_by, created_at")
    .eq("id", session.contact_id)
    .single();

  if (!contact) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("party_size, checked_in, created_at, events(id, title, date, city)")
    .eq("contact_id", session.contact_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ contact, rsvps: rsvps ?? [] });
}
