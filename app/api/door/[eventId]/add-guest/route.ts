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
  const { name, party_size, cover } = await req.json().catch(() => ({}));

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const size = Math.min(Math.max(Number(party_size) || 1, 1), 6);
  const coverCents = Math.round(Number(String(cover ?? "").replace(/[$,\s]/g, "")) * 100);
  if (cover && (!Number.isFinite(coverCents) || coverCents < 0)) {
    return NextResponse.json({ error: "Cover must be a number." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rsvps")
    .insert({ event_id: eventId, contact_id: null, guest_name: name.trim(), party_size: size })
    .select("id, party_size, checked_in, checked_in_at, guest_name, contacts(name, ig_handle)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A cover taken at the door (cash or a separate card reader) is logged as
  // a ticket so it shows up in sales and Insights.
  let paidLabel: string | null = null;
  if (coverCents > 0) {
    await supabase.from("ticket_orders").insert({
      event_id: eventId,
      rsvp_id: data.id,
      buyer_name: name.trim(),
      tier_name: "Door cover",
      channel: "door",
      status: "cash",
      amount_cents: coverCents,
      net_cents: coverCents,
      paid_at: new Date().toISOString(),
    });
    paidLabel = `Paid $${(coverCents / 100).toFixed(coverCents % 100 ? 2 : 0)} at door`;
  }

  return NextResponse.json({ rsvp: data, paidLabel });
}
