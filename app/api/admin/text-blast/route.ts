import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidMediaUrl, mediaParams, resolveTestRecipient } from "@/lib/blastMedia";
import twilio from "twilio";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { count: totalCount, error: totalError } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .not("phone", "is", null);

  const { count: optedOutCount, error: optedOutError } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .eq("sms_opted_out", true)
    .not("phone", "is", null);

  if (totalError || optedOutError) {
    return NextResponse.json({ error: "Failed to fetch counts." }, { status: 500 });
  }

  const total = totalCount ?? 0;
  const optedOut = optedOutCount ?? 0;

  return NextResponse.json({ memberCount: total - optedOut, optedOutCount: optedOut });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { message, mediaUrl, testPhone } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (!isValidMediaUrl(mediaUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  let contacts: { id: string | null; phone: string | null; name: string }[];

  if (testPhone) {
    // Test send: one message to a single number, skipping the member list.
    const recipient = await resolveTestRecipient(testPhone);
    if (!recipient) {
      return NextResponse.json({ error: "Enter a valid US phone number for the test." }, { status: 400 });
    }
    contacts = [{ id: null, phone: recipient.phone, name: recipient.phone }];
  } else {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, phone, name")
      .eq("status", "approved")
      .eq("sms_opted_out", false)
      .not("phone", "is", null)
      .range(0, 9999);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    contacts = data ?? [];
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let sent = 0;
  const failures: string[] = [];

  // Sent concurrently in bounded batches, not fully sequential — a large
  // membership list sent one-at-a-time risks the host platform's function
  // execution time limit killing the request before everyone is reached.
  const BATCH_SIZE = 10;
  const allContacts = contacts;

  for (let i = 0; i < allContacts.length; i += BATCH_SIZE) {
    const batch = allContacts.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (contact) => {
        try {
          await client.messages.create({
            body: `${message}\n\nReply STOP to opt out`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: contact.phone!,
            ...mediaParams(mediaUrl),
          });
          sent++;
        } catch (err: unknown) {
          const twilioErr = err as { code?: number };
          if (twilioErr.code === 21610 && contact.id) {
            await supabase
              .from("contacts")
              .update({ sms_opted_out: true, sms_opt_out_source: "send_bounce" })
              .eq("id", contact.id);
          }
          failures.push(contact.name);
        }
      })
    );
  }

  return NextResponse.json({ sent, failures });
}
