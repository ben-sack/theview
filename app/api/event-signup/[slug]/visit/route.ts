import { NextRequest, NextResponse } from "next/server";
import { eventHasEnded } from "@/lib/eventSignup";
import { getSignupEvent } from "@/lib/eventSignup-server";
import { recordLinkEvent } from "@/lib/signupLinkStats";

// Counts a visit to an event's public signup page, by which link it came from.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { source } = await req.json().catch(() => ({}));
  const event = await getSignupEvent(slug);
  if (!event || !event.signup_enabled || eventHasEnded(event)) {
    return NextResponse.json({ ok: false });
  }
  await recordLinkEvent(event.id, source, "visit");
  return NextResponse.json({ ok: true });
}
