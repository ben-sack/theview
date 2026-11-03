import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import {
  type Tier,
  type TierWithCounts,
  HOLD_MINUTES,
  buyerFeeCents,
  stripeFeeCents,
} from "@/lib/tickets";

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe isn't set up.");
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

// Site-wide kill switch (admin Settings tab) — on unless set to "false",
// and only when a Stripe key is configured.
export async function ticketingAvailable(): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  const { data } = await supabase.from("settings").select("value").eq("key", "ticketing_enabled").maybeSingle();
  return data?.value !== "false";
}

export async function ticketsActiveFor(event: { tickets_enabled?: boolean | null }): Promise<boolean> {
  return !!event.tickets_enabled && (await ticketingAvailable());
}

// Spots that count as taken: completed orders, plus checkouts still within
// their hold window.
const TAKEN = ["paid", "free", "cash"];

export async function loadTiers(eventId: string): Promise<TierWithCounts[]> {
  const [{ data: tiers }, { data: orders }] = await Promise.all([
    supabase.from("ticket_tiers").select("*").eq("event_id", eventId).order("position"),
    supabase.from("ticket_orders").select("tier_id, status, created_at").eq("event_id", eventId).range(0, 49999),
  ]);
  const holdCutoff = Date.now() - HOLD_MINUTES * 60 * 1000;
  return ((tiers ?? []) as Tier[]).map((t) => {
    const mine = (orders ?? []).filter((o) => o.tier_id === t.id);
    return {
      ...t,
      sold: mine.filter((o) => TAKEN.includes(o.status)).length,
      held: mine.filter((o) => o.status === "pending" && new Date(o.created_at).getTime() > holdCutoff).length,
    };
  });
}

// Total people on the list plus active checkout holds, for the event's
// overall capacity cap.
export async function spotsTaken(eventId: string): Promise<number> {
  const holdCutoff = new Date(Date.now() - HOLD_MINUTES * 60 * 1000).toISOString();
  const [{ count: listed }, { count: held }] = await Promise.all([
    supabase.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase
      .from("ticket_orders")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "pending")
      .gt("created_at", holdCutoff),
  ]);
  return (listed ?? 0) + (held ?? 0);
}

// Free tier: straight onto the list.
export async function claimFreeTicket(opts: {
  eventId: string;
  tier: Tier;
  contactId: string;
  buyerName: string;
  channel: "online" | "door";
}) {
  const checkedIn = opts.channel === "door";
  const { data: rsvp, error } = await supabase
    .from("rsvps")
    .upsert(
      {
        event_id: opts.eventId,
        contact_id: opts.contactId,
        party_size: 1,
        ...(checkedIn ? { checked_in: true, checked_in_at: new Date().toISOString() } : {}),
      },
      { onConflict: "event_id,contact_id" }
    )
    .select("id")
    .single();
  if (error) throw error;
  await supabase.from("waitlist").delete().eq("event_id", opts.eventId).eq("contact_id", opts.contactId);
  await supabase.from("ticket_orders").insert({
    event_id: opts.eventId,
    tier_id: opts.tier.id,
    tier_name: opts.tier.name,
    contact_id: opts.contactId,
    rsvp_id: rsvp.id,
    buyer_name: opts.buyerName,
    channel: opts.channel,
    status: "free",
    paid_at: new Date().toISOString(),
  });
}

// Paid tier: creates a pending order (which holds the spot) and a Stripe
// Checkout page. Returns the URL to send the buyer to.
export async function startCheckout(opts: {
  event: { id: string; title: string; ticket_fee_to_buyer?: boolean | null };
  tier: Tier;
  contactId: string;
  buyerName: string;
  email: string | null;
  channel: "online" | "door";
  returnPath: string; // e.g. /e/night-fever or /e/night-fever/door
  origin: string;
}): Promise<string> {
  const fee = opts.event.ticket_fee_to_buyer ? buyerFeeCents(opts.tier.price_cents) : 0;
  const { data: order, error } = await supabase
    .from("ticket_orders")
    .insert({
      event_id: opts.event.id,
      tier_id: opts.tier.id,
      tier_name: opts.tier.name,
      contact_id: opts.contactId,
      buyer_name: opts.buyerName,
      channel: opts.channel,
      status: "pending",
      amount_cents: opts.tier.price_cents,
      fee_cents: fee,
    })
    .select("id")
    .single();
  if (error || !order) throw error ?? new Error("Couldn't create order.");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "usd",
        unit_amount: opts.tier.price_cents,
        product_data: { name: `${opts.event.title} — ${opts.tier.name}` },
      },
      quantity: 1,
    },
  ];
  if (fee > 0) {
    lineItems.push({
      price_data: { currency: "usd", unit_amount: fee, product_data: { name: "Card processing fee" } },
      quantity: 1,
    });
  }

  const base = `${opts.origin}${opts.returnPath}`;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    ...(opts.email ? { customer_email: opts.email } : {}),
    success_url: `${base}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}?canceled=${order.id}`,
    expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60 + 60,
    metadata: { order_id: order.id, event_id: opts.event.id },
    payment_intent_data: { metadata: { order_id: order.id, event_id: opts.event.id } },
  });

  await supabase.from("ticket_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  return session.url!;
}

export type FulfilledOrder = {
  status: string;
  buyerName: string | null;
  tierName: string | null;
  amountCents: number;
  feeCents: number;
  channel: string;
  paidAt: string | null;
};

// Marks a paid checkout's order as paid and puts the buyer on the list.
// Safe to call more than once (return page + Stripe webhook).
export async function fulfillSession(sessionId: string): Promise<FulfilledOrder | null> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.order_id;
  if (!orderId) return null;

  const { data: order } = await supabase.from("ticket_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  if (order.status === "pending" && session.payment_status === "paid") {
    const checkedIn = order.channel === "door";
    let rsvpId: string | null = null;
    if (order.contact_id) {
      const { data: rsvp } = await supabase
        .from("rsvps")
        .upsert(
          {
            event_id: order.event_id,
            contact_id: order.contact_id,
            party_size: 1,
            ...(checkedIn ? { checked_in: true, checked_in_at: new Date().toISOString() } : {}),
          },
          { onConflict: "event_id,contact_id" }
        )
        .select("id")
        .single();
      rsvpId = rsvp?.id ?? null;
      await supabase.from("waitlist").delete().eq("event_id", order.event_id).eq("contact_id", order.contact_id);
    }
    const charged = order.amount_cents + order.fee_cents;
    const update = {
      status: "paid",
      paid_at: new Date().toISOString(),
      rsvp_id: rsvpId,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      net_cents: charged - stripeFeeCents(charged),
    };
    // Only flip pending → paid once, even if two calls race.
    await supabase.from("ticket_orders").update(update).eq("id", orderId).eq("status", "pending");
    Object.assign(order, update);
  }

  return {
    status: order.status,
    buyerName: order.buyer_name,
    tierName: order.tier_name,
    amountCents: order.amount_cents,
    feeCents: order.fee_cents,
    channel: order.channel,
    paidAt: order.paid_at,
  };
}

// Buyer backed out of checkout: release their hold.
export async function cancelPendingOrder(orderId: string) {
  const { data: order } = await supabase
    .from("ticket_orders")
    .select("id, status, stripe_session_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "pending") return;
  if (order.stripe_session_id) {
    const session = await stripe().checkout.sessions.retrieve(order.stripe_session_id);
    if (session.payment_status === "paid") return; // paid after all — leave it for fulfillment
    if (session.status === "open") await stripe().checkout.sessions.expire(order.stripe_session_id).catch(() => {});
  }
  await supabase.from("ticket_orders").update({ status: "canceled" }).eq("id", orderId).eq("status", "pending");
}
