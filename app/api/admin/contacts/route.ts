import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(0, 9999);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Pending people who came in through a public event signup page get
  // tagged with that event, since approving them adds them to its list.
  if (status === "pending" && data && data.length > 0) {
    const { data: signups } = await supabase
      .from("event_signups")
      .select("contact_id, was_rejected, events(title)")
      .range(0, 9999);

    const byContact = new Map<string, { titles: string[]; wasRejected: boolean }>();
    for (const s of signups ?? []) {
      const event = (Array.isArray(s.events) ? s.events[0] : s.events) as { title: string } | null;
      if (!event) continue;
      const entry = byContact.get(s.contact_id) ?? { titles: [], wasRejected: false };
      entry.titles.push(event.title);
      entry.wasRejected ||= s.was_rejected;
      byContact.set(s.contact_id, entry);
    }

    const tagged = data.map((c) => ({
      ...c,
      signup_events: byContact.get(c.id)?.titles ?? [],
      previously_rejected: byContact.get(c.id)?.wasRejected ?? false,
    }));
    return NextResponse.json({ contacts: tagged });
  }

  return NextResponse.json({ contacts: data });
}
