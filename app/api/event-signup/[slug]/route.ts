import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizePhone, isUSPhoneNumber } from "@/lib/phone";
import { eventHasEnded } from "@/lib/eventSignup";
import { getSignupEvent } from "@/lib/eventSignup-server";
import { createOptInToken } from "@/lib/optInToken";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const event = await getSignupEvent(slug);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const open = event.signup_enabled && !eventHasEnded(event);
  // Never expose capacity/admin fields beyond what the page renders.
  const { capacity: _capacity, signup_enabled: _enabled, ...publicEvent } = event;
  return NextResponse.json({ event: publicEvent, open });
}

// Public "get on the list" form for one event:
// - new person → pending contact + event_signups row (added to the list
//   automatically when an admin approves them)
// - approved member → straight onto the list (or waitlist if full)
// - pending member → event_signups row, stays pending
// - rejected → moved back to pending for re-review, + event_signups row
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const { first_name, last_name, email, phone, ig_handle, referred_by, sms_opt_in } = body;

  if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone || !ig_handle?.trim()) {
    return NextResponse.json({ error: "Please fill out all required fields." }, { status: 400 });
  }
  if (typeof sms_opt_in !== "boolean") {
    return NextResponse.json({ error: "Please let us know if we can text you." }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!isUSPhoneNumber(normalizedPhone)) {
    return NextResponse.json({ error: "Sorry, we only accept US phone numbers at the moment." }, { status: 400 });
  }

  const event = await getSignupEvent(slug);
  if (!event || !event.signup_enabled || eventHasEnded(event)) {
    return NextResponse.json({ error: "Signups for this event are closed." }, { status: 403 });
  }

  const cleanEmail = email.trim();

  // Phone is the stronger identity match, so it wins over email.
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

  if (existing?.status === "approved") {
    const { data: onList } = await supabase
      .from("rsvps")
      .select("id")
      .eq("event_id", event.id)
      .eq("contact_id", existing.id)
      .maybeSingle();
    if (onList) return NextResponse.json({ result: "already_on_list", contact_id: existing.id });

    const { count } = await supabase
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);

    if ((count ?? 0) >= event.capacity) {
      const { error } = await supabase
        .from("waitlist")
        .upsert({ event_id: event.id, contact_id: existing.id, party_size: 1 }, { onConflict: "event_id,contact_id" });
      if (error) return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
      return NextResponse.json({ result: "waitlisted", contact_id: existing.id });
    }

    const { error } = await supabase
      .from("rsvps")
      .upsert({ event_id: event.id, contact_id: existing.id, party_size: 1 }, { onConflict: "event_id,contact_id" });
    if (error) return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
    return NextResponse.json({ result: "on_list", contact_id: existing.id });
  }

  let contactId: string;
  // Whether they end up unable to receive texts because they declined on a
  // form (not a STOP reply) — those people get a chance to opt in after.
  let declinedTexts: boolean;
  const wasRejected = existing?.status === "rejected";

  if (existing) {
    contactId = existing.id;
    const update: Record<string, unknown> = {};
    if (wasRejected) update.status = "pending";
    // A fresh "Yes, text me" overrides an earlier form decline, but never a
    // STOP reply or carrier block — those must stay opted out.
    if (sms_opt_in && existing.sms_opted_out && existing.sms_opt_out_source === "signup") {
      update.sms_opted_out = false;
      update.sms_opt_out_source = null;
    }
    declinedTexts = existing.sms_opted_out && existing.sms_opt_out_source === "signup" && update.sms_opted_out !== false;
    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from("contacts").update(update).eq("id", contactId);
      if (error) return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
    }
  } else {
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        name: `${first_name.trim()} ${last_name.trim()}`,
        email: cleanEmail,
        phone: normalizedPhone,
        ig_handle: ig_handle.trim(),
        referred_by: referred_by?.trim() || null,
        status: "pending",
        sms_opted_out: !sms_opt_in,
        sms_opt_out_source: sms_opt_in ? null : "signup",
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("Event signup contact insert error:", error);
      return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
    }
    contactId = data.id;
    declinedTexts = !sms_opt_in;
  }

  const { error: signupError } = await supabase
    .from("event_signups")
    .upsert(
      // was_rejected is only ever set, never cleared by a later resubmit.
      { event_id: event.id, contact_id: contactId, ...(wasRejected ? { was_rejected: true } : {}) },
      { onConflict: "event_id,contact_id" }
    );
  if (signupError) {
    console.error("Event signup insert error:", signupError);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    result: "pending",
    contact_id: contactId,
    ...(declinedTexts ? { opt_in_token: createOptInToken(contactId) } : {}),
  });
}
