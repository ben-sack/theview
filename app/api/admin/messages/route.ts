import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

type Inbound = { id: string; from_phone: string; body: string; keyword_type: string | null; received_at: string; read_at: string | null };
type Reply = { id: string; to_phone: string; body: string; sent_at: string };

// Texts people sent our number, plus our replies, grouped into one
// conversation per phone number (newest activity first).
// ?count=1 returns just the unread count for the tab badge.
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // STOP/START/HELP are handled automatically, so they never count as unread.
  if (req.nextUrl.searchParams.get("count")) {
    const { count } = await supabase
      .from("inbound_messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .is("keyword_type", null);
    return NextResponse.json({ unread: count ?? 0 });
  }

  const { data: inbound, error: inboundError } = await supabase
    .from("inbound_messages")
    .select("id, from_phone, body, keyword_type, received_at, read_at")
    .order("received_at", { ascending: true })
    .range(0, 9999);
  if (inboundError) {
    return NextResponse.json({ error: inboundError.message }, { status: 500 });
  }

  const { data: replies, error: repliesError } = await supabase
    .from("sms_replies")
    .select("id, to_phone, body, sent_at")
    .order("sent_at", { ascending: true })
    .range(0, 9999);
  if (repliesError) {
    return NextResponse.json({ error: repliesError.message }, { status: 500 });
  }

  const phones = [...new Set((inbound as Inbound[]).map((m) => m.from_phone))];
  const { data: contacts } = phones.length
    ? await supabase.from("contacts").select("id, name, phone, status, sms_opted_out").in("phone", phones)
    : { data: [] };
  const contactByPhone = new Map((contacts ?? []).map((c) => [c.phone, c]));

  const conversations = phones.map((phone) => {
    const theirs = (inbound as Inbound[]).filter((m) => m.from_phone === phone);
    const ours = (replies as Reply[]).filter((r) => r.to_phone === phone);
    const messages = [
      ...theirs.map((m) => ({ id: m.id, from: "them" as const, body: m.body, keyword: m.keyword_type, at: m.received_at })),
      ...ours.map((r) => ({ id: r.id, from: "us" as const, body: r.body, keyword: null, at: r.sent_at })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const contact = contactByPhone.get(phone);
    // Opted out if their contact record says so, or — for people not in
    // contacts — if the last keyword they texted was STOP.
    const lastKeyword = [...theirs].reverse().find((m) => m.keyword_type === "stop" || m.keyword_type === "start");
    const optedOut = contact ? contact.sms_opted_out : lastKeyword?.keyword_type === "stop";
    return {
      phone,
      name: contact?.name ?? null,
      status: contact?.status ?? null,
      optedOut,
      unread: theirs.filter((m) => !m.read_at && !m.keyword_type).length,
      lastAt: messages[messages.length - 1]?.at,
      messages,
    };
  });

  conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  return NextResponse.json({ conversations });
}
