import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveGender } from "@/lib/estimateGender";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

type Rsvp = {
  event_id: string;
  contact_id: string | null;
  party_size: number | null;
  checked_in: boolean;
  guest_name: string | null;
  contacts: { name: string; gender_override: string | null } | { name: string; gender_override: string | null }[] | null;
};

function monthKey(iso: string) {
  // Group by Los Angeles calendar month.
  const d = new Date(iso);
  const la = new Date(d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return `${la.getFullYear()}-${String(la.getMonth() + 1).padStart(2, "0")}`;
}

// Monthly Twilio spend straight from Twilio's billing records (includes
// carrier fees and the phone number). Best-effort — null if unavailable.
async function twilioMonthly(): Promise<{ month: string; total: number }[] | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Usage/Records/Monthly.json?Category=totalprice&PageSize=36`,
      { headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.usage_records ?? [])
      .map((r: { start_date: string; price: string | null }) => ({ month: r.start_date.slice(0, 7), total: Number(r.price ?? 0) }))
      .filter((r: { total: number }) => r.total > 0)
      .sort((a: { month: string }, b: { month: string }) => a.month.localeCompare(b.month));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [eventsRes, rsvpsRes, contactsRes, waitlistRes, linkRes, inboundRes, twilio, ticketsRes] = await Promise.all([
    supabase.from("events").select("*").order("date", { ascending: true }),
    supabase
      .from("rsvps")
      .select("event_id, contact_id, party_size, checked_in, guest_name, contacts(name, gender_override)")
      .range(0, 49999),
    supabase.from("contacts").select("status, created_at, referred_by").range(0, 49999),
    supabase.from("waitlist").select("event_id").range(0, 49999),
    supabase.from("signup_link_events").select("source, kind").range(0, 99999),
    supabase.from("inbound_messages").select("keyword_type, received_at").eq("keyword_type", "stop").range(0, 49999),
    twilioMonthly(),
    // Ticket money after card fees. Tolerates the table not existing.
    supabase.from("ticket_orders").select("event_id, net_cents").in("status", ["paid", "cash"]).range(0, 49999),
  ]);
  const ticketCents = new Map<string, number>();
  for (const o of ticketsRes.data ?? []) ticketCents.set(o.event_id, (ticketCents.get(o.event_id) ?? 0) + o.net_cents);

  if (eventsRes.error || rsvpsRes.error || contactsRes.error) {
    return NextResponse.json(
      { error: eventsRes.error?.message ?? rsvpsRes.error?.message ?? contactsRes.error?.message },
      { status: 500 }
    );
  }

  const rsvps = (rsvpsRes.data ?? []) as Rsvp[];
  const now = Date.now();

  // ── Events ──
  const attendedBy = new Map<string, Set<string>>(); // contact → events checked in
  const events = (eventsRes.data ?? []).map((e) => {
    const rows = rsvps.filter((r) => r.event_id === e.id);
    const members = rows.filter((r) => r.contact_id);
    const walkIns = rows.filter((r) => !r.contact_id);
    const size = (r: Rsvp) => r.party_size || 1;
    const rsvpPeople = members.reduce((s, r) => s + size(r), 0);
    const rsvpShowed = members.filter((r) => r.checked_in).reduce((s, r) => s + size(r), 0);
    const walkInsIn = walkIns.filter((r) => r.checked_in).reduce((s, r) => s + size(r), 0);
    const gender = { male: 0, female: 0, unsure: 0 };
    for (const r of rows.filter((x) => x.checked_in)) {
      const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
      gender[resolveGender(c?.name ?? r.guest_name, c?.gender_override)]++;
      if (r.contact_id) {
        if (!attendedBy.has(r.contact_id)) attendedBy.set(r.contact_id, new Set());
        attendedBy.get(r.contact_id)!.add(e.id);
      }
    }
    const attended = rsvpShowed + walkInsIn;
    const bar = e.bar_revenue != null ? Number(e.bar_revenue) : null;
    const other = e.other_revenue != null ? Number(e.other_revenue) : null;
    const expenses = e.expenses != null ? Number(e.expenses) : null;
    const tickets = (ticketCents.get(e.id) ?? 0) / 100;
    return {
      id: e.id,
      title: e.title?.trim(),
      date: e.date,
      eventNumber: e.event_number,
      capacity: e.capacity,
      past: new Date(e.date).getTime() < now,
      rsvpPeople,
      rsvpShowed,
      showRate: rsvpPeople ? rsvpShowed / rsvpPeople : null,
      walkIns: walkInsIn,
      attended,
      waitlist: (waitlistRes.data ?? []).filter((w) => w.event_id === e.id).length,
      gender,
      barRevenue: bar,
      otherRevenue: other,
      ticketRevenue: tickets,
      expenses,
      profit: bar != null && expenses != null ? bar + (other ?? 0) + tickets - expenses : null,
      barPerGuest: bar != null && attended ? bar / attended : null,
    };
  });

  // ── Repeat guests (members checked in at 2+ events) ──
  const attendees = attendedBy.size;
  const repeat = [...attendedBy.values()].filter((s) => s.size >= 2).length;

  // ── Members ──
  const contacts = contactsRes.data ?? [];
  const statusCounts = { approved: 0, pending: 0, rejected: 0 };
  const signupsByMonth: Record<string, number> = {};
  const referrers: Record<string, number> = {};
  for (const c of contacts) {
    if (c.status in statusCounts) statusCounts[c.status as keyof typeof statusCounts]++;
    const m = monthKey(c.created_at);
    signupsByMonth[m] = (signupsByMonth[m] ?? 0) + 1;
    const ref = c.referred_by?.trim();
    if (ref) {
      // Group case-insensitively, keep the first spelling seen.
      const key = Object.keys(referrers).find((k) => k.toLowerCase() === ref.toLowerCase()) ?? ref;
      referrers[key] = (referrers[key] ?? 0) + 1;
    }
  }

  // ── Signup page links ──
  const linkTotals: Record<string, { visits: number; submits: number }> = {};
  for (const l of linkRes.data ?? []) {
    const t = (linkTotals[l.source] ??= { visits: 0, submits: 0 });
    if (l.kind === "visit") t.visits++;
    else t.submits++;
  }

  // ── STOP replies by month ──
  const stopsByMonth: Record<string, number> = {};
  for (const m of inboundRes.data ?? []) {
    const k = monthKey(m.received_at);
    stopsByMonth[k] = (stopsByMonth[k] ?? 0) + 1;
  }

  return NextResponse.json({
    events,
    repeat: { attendees, repeat },
    members: {
      ...statusCounts,
      total: contacts.length,
      signupsByMonth: Object.entries(signupsByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
      topReferrers: Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    },
    links: linkTotals,
    texting: {
      monthly: twilio,
      stopsByMonth: Object.entries(stopsByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
    },
  });
}
