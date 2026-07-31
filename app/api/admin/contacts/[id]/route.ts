import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import twilio from "twilio";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

async function sendApprovalSms(phone: string, name: string) {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "sms_template")
    .single();

  const template = data?.value;
  if (!template) return;

  const firstName = name.split(" ")[0];
  const message = `${template.replace(/\{name\}/gi, firstName)}\n\nReply STOP to opt out`;

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, rejection_reason, notes } = body;

  // Notes-only update
  if (notes !== undefined && !status) {
    const { error } = await supabase.from("contacts").update({ notes }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: contact, error: fetchError } = await supabase
    .from("contacts")
    .select("name, phone")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const updateData: Record<string, string> = { status };
  if (status === "rejected" && rejection_reason) {
    updateData.rejection_reason = rejection_reason;
  }

  const { error } = await supabase
    .from("contacts")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === "approved" && contact?.phone) {
    try {
      await sendApprovalSms(contact.phone, contact.name);
    } catch (smsError) {
      console.error("SMS failed:", smsError);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: deletedContact } = await supabase
    .from("contacts")
    .select("name")
    .eq("id", id)
    .single();

  if (deletedContact?.name) {
    const nameKey = deletedContact.name.trim().toLowerCase();

    const { data: referredContacts } = await supabase
      .from("contacts")
      .select("id, referred_by")
      .not("referred_by", "is", null);

    const matchingIds = (referredContacts ?? [])
      .filter((c) => c.referred_by?.trim().toLowerCase() === nameKey)
      .map((c) => c.id);

    if (matchingIds.length > 0) {
      await supabase.from("contacts").update({ referred_by: null }).in("id", matchingIds);
    }
  }

  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
