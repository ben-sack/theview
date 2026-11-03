// Ticket tiers — shared by the server and the admin/signup pages.
// Tiers sell in order (by position): the first tier that's open to the
// buyer, sold where they're buying, not past its end date and not sold out
// is the one they get. When it sells out or ends, the next one takes over.

export type TierAudience = "members" | "anyone";
export type TierChannel = "online" | "door" | "both";

export type Tier = {
  id: string;
  event_id: string;
  position: number;
  name: string;
  price_cents: number;
  quantity: number | null; // null = unlimited
  audience: TierAudience;
  channel: TierChannel;
  ends_at: string | null;
};

export type TierWithCounts = Tier & { sold: number; held: number };

// Stripe's US online card rate, used for buyer fees and net revenue.
export const CARD_FEE_PCT = 0.029;
export const CARD_FEE_FLAT_CENTS = 30;
// A checkout holds its spot this long (Stripe's minimum session length).
export const HOLD_MINUTES = 30;

export function stripeFeeCents(chargeCents: number): number {
  return chargeCents > 0 ? Math.round(chargeCents * CARD_FEE_PCT + CARD_FEE_FLAT_CENTS) : 0;
}

// Fee added on top when the buyer pays it, so we still net the full price.
export function buyerFeeCents(priceCents: number): number {
  if (priceCents <= 0) return 0;
  return Math.ceil((priceCents + CARD_FEE_FLAT_CENTS) / (1 - CARD_FEE_PCT)) - priceCents;
}

export function formatCents(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

export function tierRemaining(t: TierWithCounts): number | null {
  return t.quantity == null ? null : Math.max(0, t.quantity - t.sold - t.held);
}

export function tierEnded(t: Tier, now = Date.now()): boolean {
  return !!t.ends_at && new Date(t.ends_at).getTime() <= now;
}

export function sellsAt(t: Tier, channel: "online" | "door"): boolean {
  return t.channel === "both" || t.channel === channel;
}

export function pickTier(
  tiers: TierWithCounts[],
  { channel, isMember, now = Date.now() }: { channel: "online" | "door"; isMember: boolean; now?: number }
): TierWithCounts | null {
  return (
    [...tiers]
      .sort((a, b) => a.position - b.position)
      .find(
        (t) =>
          sellsAt(t, channel) &&
          (t.audience === "anyone" || isMember) &&
          !tierEnded(t, now) &&
          (tierRemaining(t) ?? 1) > 0
      ) ?? null
  );
}

// What the public signup page shows about each tier.
export type PublicTier = {
  name: string;
  price_cents: number;
  audience: TierAudience;
  channel: TierChannel;
  remaining: number | null;
  ends_at: string | null;
  state: "current" | "upcoming" | "sold_out" | "ended";
};
export type TicketInfo = { tiers: PublicTier[]; feeToBuyer: boolean };

export function publicTiers(tiers: TierWithCounts[], now = Date.now()): PublicTier[] {
  const current = new Set(
    [
      pickTier(tiers, { channel: "online", isMember: true, now }),
      pickTier(tiers, { channel: "online", isMember: false, now }),
      pickTier(tiers, { channel: "door", isMember: true, now }),
      pickTier(tiers, { channel: "door", isMember: false, now }),
    ]
      .filter(Boolean)
      .map((t) => t!.id)
  );
  return [...tiers]
    .sort((a, b) => a.position - b.position)
    .map((t) => {
      const remaining = tierRemaining(t);
      return {
        name: t.name,
        price_cents: t.price_cents,
        audience: t.audience,
        channel: t.channel,
        remaining,
        ends_at: t.ends_at,
        state: tierEnded(t, now) ? "ended" : remaining === 0 ? "sold_out" : current.has(t.id) ? "current" : "upcoming",
      };
    });
}

// Which tiers the public signup page lists (per event).
export type TierDisplay = "current" | "current_past" | "all";
export const TIER_DISPLAY_LABELS: Record<TierDisplay, string> = {
  current: "Only the current tier",
  current_past: "Current + sold-out tiers",
  all: "All tiers (past, current, upcoming)",
};

export function filterPublicTiers(tiers: PublicTier[], display: TierDisplay): PublicTier[] {
  if (display === "current") return tiers.filter((t) => t.state === "current");
  if (display === "current_past") return tiers.filter((t) => t.state !== "upcoming");
  return tiers;
}
