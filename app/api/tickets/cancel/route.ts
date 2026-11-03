import { NextRequest, NextResponse } from "next/server";
import { cancelPendingOrder } from "@/lib/tickets-server";

// Buyer hit "back" on Stripe's checkout — release the spot they were holding.
export async function POST(req: NextRequest) {
  const { order_id } = await req.json().catch(() => ({}));
  if (typeof order_id !== "string" || !/^[0-9a-f-]{36}$/.test(order_id)) {
    return NextResponse.json({ error: "Missing order." }, { status: 400 });
  }
  try {
    await cancelPendingOrder(order_id);
  } catch (err) {
    console.error("Ticket cancel error:", err);
  }
  return NextResponse.json({ success: true });
}
