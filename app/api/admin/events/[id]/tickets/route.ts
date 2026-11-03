import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { loadTiers, ticketingAvailable } from "@/lib/tickets-server";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;

  const { data: event, error } = await supabase
    .from("events")
    .select("id, signup_slug, tickets_enabled, ticket_fee_to_buyer, ticket_tier_display")
    .eq("id", id)
    .single();
  if (error || !event) return NextResponse.json({ error: error?.message ?? "Event not found." }, { status: 500 });

  const [tiers, { data: orders }] = await Promise.all([
    loadTiers(id),
    supabase
      .from("ticket_orders")
      .select("id, tier_name, buyer_name, channel, status, amount_cents, fee_cents, net_cents, created_at, paid_at, contacts(name)")
      .eq("event_id", id)
      .in("status", ["paid", "free", "cash", "refunded"])
      .order("created_at", { ascending: false })
      .range(0, 4999),
  ]);

  const doorUrl = event.signup_slug ? `${req.nextUrl.origin}/e/${event.signup_slug}/door` : null;
  const qr = doorUrl ? await QRCode.toDataURL(doorUrl, { width: 600, margin: 2 }) : null;

  return NextResponse.json({
    available: await ticketingAvailable(),
    stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
    tickets_enabled: !!event.tickets_enabled,
    ticket_fee_to_buyer: !!event.ticket_fee_to_buyer,
    ticket_tier_display: event.ticket_tier_display ?? "all",
    tiers,
    orders: (orders ?? []).map((o) => ({
      ...o,
      contacts: undefined,
      name: (Array.isArray(o.contacts) ? o.contacts[0] : o.contacts)?.name ?? o.buyer_name,
    })),
    doorUrl,
    qr,
  });
}

type TierInput = {
  id?: string;
  name: string;
  price_cents: number;
  quantity: number | null;
  audience: string;
  channel: string;
  ends_at: string | null;
};

// Saves the event's ticket settings and its full tier list (in order).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const { tickets_enabled, ticket_fee_to_buyer, ticket_tier_display, tiers } = await req.json().catch(() => ({}));
  const display = ["current", "current_past", "all"].includes(ticket_tier_display) ? ticket_tier_display : "all";

  if (!Array.isArray(tiers)) return NextResponse.json({ error: "Tiers are required." }, { status: 400 });
  for (const t of tiers as TierInput[]) {
    if (!t.name?.trim()) return NextResponse.json({ error: "Every tier needs a name." }, { status: 400 });
    if (!Number.isInteger(t.price_cents) || t.price_cents < 0) return NextResponse.json({ error: `"${t.name}" has an invalid price.` }, { status: 400 });
    if (t.price_cents > 0 && t.price_cents < 50) return NextResponse.json({ error: `"${t.name}": paid tickets must be at least $0.50.` }, { status: 400 });
    if (t.quantity != null && (!Number.isInteger(t.quantity) || t.quantity < 0)) return NextResponse.json({ error: `"${t.name}" has an invalid quantity.` }, { status: 400 });
    if (!["members", "anyone"].includes(t.audience) || !["online", "door", "both"].includes(t.channel)) {
      return NextResponse.json({ error: `"${t.name}" has invalid settings.` }, { status: 400 });
    }
  }
  if (tickets_enabled && tiers.length === 0) {
    return NextResponse.json({ error: "Add at least one tier before turning tickets on." }, { status: 400 });
  }

  const { data: existing } = await supabase.from("ticket_tiers").select("id").eq("event_id", id);
  const keep = new Set((tiers as TierInput[]).map((t) => t.id).filter(Boolean));
  const removed = (existing ?? []).map((t) => t.id).filter((tid) => !keep.has(tid));
  if (removed.length) {
    const { error } = await supabase.from("ticket_tiers").delete().in("id", removed);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const [position, t] of (tiers as TierInput[]).entries()) {
    const row = {
      event_id: id,
      position,
      name: t.name.trim(),
      price_cents: t.price_cents,
      quantity: t.quantity,
      audience: t.audience,
      channel: t.channel,
      ends_at: t.ends_at || null,
    };
    const { error } = t.id
      ? await supabase.from("ticket_tiers").update(row).eq("id", t.id).eq("event_id", id)
      : await supabase.from("ticket_tiers").insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("events")
    .update({ tickets_enabled: !!tickets_enabled, ticket_fee_to_buyer: !!ticket_fee_to_buyer, ticket_tier_display: display })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
