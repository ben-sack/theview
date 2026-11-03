import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getSignupEvent } from "@/lib/eventSignup-server";
import { eventHasEnded } from "@/lib/eventSignup";
import { EventSignupContent } from "@/components/EventSignupContent";
import { loadTiers, ticketsActiveFor } from "@/lib/tickets-server";
import { publicTiers, type TicketInfo } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getSignupEvent(slug);
  if (!event) return {};
  const title = `${event.title} — The View`;
  const description = event.signup_headline || "Request a spot on the list.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(event.signup_flyer_url ? { images: [{ url: event.signup_flyer_url }] } : {}),
    },
  };
}

export default async function EventSignupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getSignupEvent(slug);
  if (!event) notFound();

  const ended = eventHasEnded(event);
  // Admins can preview a page before turning it on.
  const isAdmin = (await cookies()).get("admin_auth")?.value === "true";
  const preview = !event.signup_enabled && !ended && isAdmin;
  const tickets: TicketInfo | null = (await ticketsActiveFor(event))
    ? { tiers: publicTiers(await loadTiers(event.id)), feeToBuyer: !!event.ticket_fee_to_buyer }
    : null;

  return (
    <EventSignupContent
      slug={event.signup_slug ?? slug}
      event={{
        title: event.title,
        date: event.date,
        end_time: event.end_time,
        city: event.city,
        partners: event.partners,
        flyerUrl: event.signup_flyer_url,
        headline: event.signup_headline,
        copy: event.signup_copy,
      }}
      tickets={tickets}
      status={ended ? "ended" : event.signup_enabled ? "open" : preview ? "preview" : "closed"}
    />
  );
}
