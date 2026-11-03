import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { stripe } from "@/lib/tickets-server";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// Refunds a ticket in full (card payments through Stripe; cash just gets
// marked) and takes the guest off the list.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { order_id } = await req.json().catch(() => ({}));

  const { data: order } = await supabase.from("ticket_orders").select("*").eq("id", order_id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!["paid", "cash", "free"].includes(order.status)) {
    return NextResponse.json({ error: "This ticket can't be refunded." }, { status: 400 });
  }

  if (order.status === "paid" && order.stripe_payment_intent) {
    try {
      await stripe().refunds.create({ payment_intent: order.stripe_payment_intent });
    } catch (err) {
      console.error("Refund failed:", err);
      return NextResponse.json({ error: "Stripe couldn't process the refund. Try again or refund it in the Stripe dashboard." }, { status: 500 });
    }
  }

  await supabase
    .from("ticket_orders")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", order.id);
  if (order.rsvp_id) await supabase.from("rsvps").delete().eq("id", order.rsvp_id);

  return NextResponse.json({ success: true });
}
