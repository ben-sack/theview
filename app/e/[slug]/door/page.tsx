import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSignupEvent } from "@/lib/eventSignup-server";
import { eventHasEnded } from "@/lib/eventSignup";
import { loadTiers, ticketsActiveFor } from "@/lib/tickets-server";
import { pickTier, buyerFeeCents } from "@/lib/tickets";
import { DoorTicketContent } from "@/components/DoorTicketContent";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getSignupEvent(slug);
  return event ? { title: `${event.title} — Door — The View`, robots: { index: false } } : {};
}

export default async function DoorTicketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getSignupEvent(slug);
  if (!event) notFound();

  const active = !eventHasEnded(event) && (await ticketsActiveFor(event));
  // Price shown is for non-members; members are matched by phone at submit.
  const tier = active ? pickTier(await loadTiers(event.id), { channel: "door", isMember: false }) : null;

  return (
    <DoorTicketContent
      slug={event.signup_slug ?? slug}
      title={event.title}
      open={active}
      priceCents={tier ? tier.price_cents + (event.ticket_fee_to_buyer ? buyerFeeCents(tier.price_cents) : 0) : null}
      tierName={tier?.name ?? null}
    />
  );
}
