import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizePhone, isUSPhoneNumber } from "@/lib/phone";
import { eventHasEnded } from "@/lib/eventSignup";
import { getSignupEvent } from "@/lib/eventSignup-server";
import { pickTier } from "@/lib/tickets";
import { claimFreeTicket, loadTiers, spotsTaken, startCheckout, ticketsActiveFor } from "@/lib/tickets-server";

// Door QR page purchase: a walk-in pays (or claims a free door tier) on
// their own phone and shows the confirmation to the door.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { first_name, last_name, email, phone, sms_opt_in } = await req.json().catch(() => ({}));

  if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone) {
    return NextResponse.json({ error: "Please fill out all fields." }, { status: 400 });
  }
  if (typeof sms_opt_in !== "boolean") {
    return NextResponse.json({ error: "Please let us know if we can text you." }, { status: 400 });
  }
  const normalizedPhone = normalizePhone(phone);
  if (!isUSPhoneNumber(normalizedPhone)) {
    return NextResponse.json({ error: "Sorry, we only accept US phone numbers at the moment." }, { status: 400 });
  }

  const event = await getSignupEvent(slug);
  if (!event || eventHasEnded(event) || !(await ticketsActiveFor(event))) {
    return NextResponse.json({ error: "Door tickets aren't available for this event." }, { status: 403 });
  }

  const cleanEmail = email.trim();
  const name = `${first_name.trim()} ${last_name.trim()}`;
  const { data: byPhone } = await supabase
    .from("contacts")
    .select("id, name, status, sms_opted_out, sms_opt_out_source")
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle();
  const { data: byEmail } = byPhone
    ? { data: null }
    : await supabase
        .from("contacts")
        .select("id, name, status, sms_opted_out, sms_opt_out_source")
        .ilike("email", cleanEmail)
        .limit(1)
        .maybeSingle();
  const existing = byPhone ?? byEmail;

  if (existing) {
    const { data: onList } = await supabase
      .from("rsvps")
      .select("id")
      .eq("event_id", event.id)
      .eq("contact_id", existing.id)
      .maybeSingle();
    if (onList) return NextResponse.json({ result: "already_on_list", name: existing.name });
  }
  if (existing?.status === "rejected") {
    return NextResponse.json({ result: "see_staff" });
  }

  const tier = pickTier(await loadTiers(event.id), { channel: "door", isMember: existing?.status === "approved" });
  if (!tier || (await spotsTaken(event.id)) >= event.capacity) {
    return NextResponse.json({ result: "sold_out" });
  }

  let contactId = existing?.id;
  if (existing) {
    if (sms_opt_in && existing.sms_opted_out && existing.sms_opt_out_source === "signup") {
      await supabase.from("contacts").update({ sms_opted_out: false, sms_opt_out_source: null }).eq("id", existing.id);
    }
  } else {
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        name,
        email: cleanEmail,
        phone: normalizedPhone,
        status: "pending",
        sms_opted_out: !sms_opt_in,
        sms_opt_out_source: sms_opt_in ? null : "signup",
      })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    contactId = data.id;
  }

  const buyerName = existing?.name ?? name;
  try {
    if (tier.price_cents === 0) {
      await claimFreeTicket({ eventId: event.id, tier, contactId: contactId!, buyerName, channel: "door" });
      return NextResponse.json({ result: "in", name: buyerName, tierName: tier.name });
    }
    const url = await startCheckout({
      event,
      tier,
      contactId: contactId!,
      buyerName,
      email: cleanEmail,
      channel: "door",
      returnPath: `/e/${event.signup_slug}/door`,
      origin: req.nextUrl.origin,
    });
    return NextResponse.json({ result: "checkout", checkout_url: url });
  } catch (err) {
    console.error("Door ticket error:", err);
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 500 });
  }
}
