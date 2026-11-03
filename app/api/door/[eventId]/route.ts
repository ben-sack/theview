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
    .select("id, party_size, checked_in, checked_in_at, guest_name, contacts(name, ig_handle)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sorted = (rsvps ?? []).sort((a, b) => {
    const nameA = (Array.isArray(a.contacts) ? a.contacts[0] : a.contacts)?.name ?? a.guest_name ?? "";
    const nameB = (Array.isArray(b.contacts) ? b.contacts[0] : b.contacts)?.name ?? b.guest_name ?? "";
    return nameA.localeCompare(nameB);
  });

  // "Paid $X" labels for guests with a ticket or door cover.
  const { data: orders } = await supabase
    .from("ticket_orders")
    .select("rsvp_id, status, amount_cents, fee_cents, channel")
    .eq("event_id", eventId)
    .in("status", ["paid", "cash", "free"])
    .not("rsvp_id", "is", null);
  const paid: Record<string, string> = {};
  for (const o of orders ?? []) {
    const cents = o.amount_cents + o.fee_cents;
    paid[o.rsvp_id] = o.status === "free" ? "Free ticket" : `Paid $${(cents / 100).toFixed(cents % 100 ? 2 : 0)}${o.channel === "door" ? " at door" : " online"}`;
  }

  return NextResponse.json({ event, rsvps: sorted, paid });
}
