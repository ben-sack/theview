import { NextRequest, NextResponse } from "next/server";
import { fulfillSession, stripe } from "@/lib/tickets-server";

// Stripe's backup confirmation: marks orders paid even if the buyer closes
// the page before returning to our site. Needs STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await fulfillSession(event.data.object.id);
  }
  return NextResponse.json({ received: true });
}
