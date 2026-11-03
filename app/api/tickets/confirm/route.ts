import { NextRequest, NextResponse } from "next/server";
import { fulfillSession } from "@/lib/tickets-server";

// Called by the signup/door page when Stripe sends the buyer back.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
  }
  try {
    const order = await fulfillSession(sessionId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    console.error("Ticket confirm error:", err);
    return NextResponse.json({ error: "Couldn't confirm your payment." }, { status: 500 });
  }
}
