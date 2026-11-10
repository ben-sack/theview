"use client";
import { useEffect, useMemo, useState } from "react";

type EventStat = {
  id: string;
  title: string;
  date: string;
  eventNumber: number;
  capacity: number;
  past: boolean;
  rsvpPeople: number;
  rsvpShowed: number;
  showRate: number | null;
  walkIns: number;
  attended: number;
  waitlist: number;
  gender: { male: number; female: number; unsure: number };
  barRevenue: number | null;
  otherRevenue: number | null;
  ticketRevenue: number;
  expenses: number | null;
  profit: number | null;
  barPerGuest: number | null;
};

type Insights = {
  events: EventStat[];
  repeat: { attendees: number; repeat: number };
  members: {
    approved: number;
    pending: number;
    rejected: number;
    total: number;
    signupsByMonth: { month: string; count: number }[];
    topReferrers: { name: string; count: number }[];
  };
  links: Record<string, { visits: number; submits: number }>;
  texting: {
    monthly: { month: string; total: number }[] | null;
    stopsByMonth: { month: string; count: number }[];
  };
};

// Card fees used for ticket projections (Stripe online rate).
const CARD_FEE_PCT = 0.029;
const CARD_FEE_FLAT = 0.3;
const FALLBACK_BAR_PER_GUEST = 30;
const FALLBACK_EXPENSES = 3700;
// Profit split with Dylan (bar owner): expenses come off first, then the
// remaining profit is split — 65% to The View, 35% to Dylan.
const OUR_SHARE = 0.65;

const LINK_LABELS: Record<string, string> = {
  tiktok: "TikTok link",
  instagram: "Instagram link",
  partiful: "Partiful link",
  friend: "Friend invites",
  direct: "Plain link / other",
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-tan/20 shadow-sm px-4 py-3">
      <p className="font-body text-[10px] tracking-widest uppercase text-tan">{label}</p>
      <p className="font-display text-2xl sm:text-3xl text-espresso font-light mt-1">{value}</p>
      {sub && <p className="font-body text-[11px] text-tan mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-4 sm:p-6 space-y-4">
      <div>
        <p className="font-body text-sm font-medium text-espresso">{title}</p>
        {note && <p className="font-body text-xs text-tan mt-0.5">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function Bars({ rows, format }: { rows: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="font-body text-xs text-tan italic">No data yet.</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 font-body text-xs">
          <span className="w-14 shrink-0 text-tan">{r.label}</span>
          <div className="flex-1 bg-ivory rounded h-5 overflow-hidden">
            <div className="bg-rust/70 h-full rounded" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="w-14 shrink-0 text-right text-espresso">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function NumberInput({ label, value, onChange, prefix, suffix, step }: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-body text-[11px] text-tan">{label}</span>
      <div className="flex items-center bg-ivory border border-tan/30 rounded px-2 py-1.5 font-body text-sm focus-within:border-rust">
        {prefix && <span className="text-tan mr-1">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step ?? 1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full min-w-0 bg-transparent text-black focus:outline-none"
        />
        {suffix && <span className="text-tan ml-1">{suffix}</span>}
      </div>
    </label>
  );
}

// Money numbers for one event, typed in after the night.
function FinancialsRow({ event, onSaved }: { event: EventStat; onSaved: () => void }) {
  const [bar, setBar] = useState(event.barRevenue?.toString() ?? "");
  const [other, setOther] = useState(event.otherRevenue?.toString() ?? "");
  const [expenses, setExpenses] = useState(event.expenses?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const dirty =
    bar !== (event.barRevenue?.toString() ?? "") ||
    other !== (event.otherRevenue?.toString() ?? "") ||
    expenses !== (event.expenses?.toString() ?? "");

  async function save() {
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/insights/financials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: event.id, bar_revenue: bar, other_revenue: other, expenses }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setStatus(d.error ?? "Failed to save."); return; }
    setStatus("Saved ✓");
    onSaved();
  }

  const field = (value: string, set: (v: string) => void, placeholder: string) => (
    <div className="flex items-center bg-ivory border border-tan/30 rounded px-2 py-1 font-body text-sm focus-within:border-rust">
      <span className="text-tan mr-1">$</span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        className="w-20 bg-transparent text-black placeholder-tan/40 focus:outline-none"
      />
    </div>
  );

  return (
    <tr className="border-b border-tan/10">
      <td className="font-body text-sm text-espresso py-2 pr-3 whitespace-nowrap">{event.title}</td>
      <td className="py-2 pr-3">{field(bar, setBar, "0")}</td>
      <td className="py-2 pr-3">{field(other, setOther, "0")}</td>
      <td className="font-body text-sm py-2 pr-3 whitespace-nowrap text-espresso">
        {event.ticketRevenue > 0 ? money(event.ticketRevenue) : <span className="text-tan">—</span>}
      </td>
      <td className="py-2 pr-3">{field(expenses, setExpenses, "0")}</td>
      <td className="font-body text-sm py-2 pr-3 whitespace-nowrap">
        {event.profit != null ? (
          <span className={event.profit >= 0 ? "text-green-700" : "text-rust"}>{money(event.profit)}</span>
        ) : (
          <span className="text-tan">—</span>
        )}
      </td>
      <td className="font-body text-sm py-2 pr-3 whitespace-nowrap text-espresso">
        {event.profit != null ? money(event.profit * OUR_SHARE) : <span className="text-tan">—</span>}
      </td>
      <td className="font-body text-sm py-2 pr-3 whitespace-nowrap text-espresso">
        {event.profit != null ? money(event.profit * (1 - OUR_SHARE)) : <span className="text-tan">—</span>}
      </td>
      <td className="py-2 whitespace-nowrap">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="font-body text-xs text-rust hover:underline disabled:opacity-40 disabled:no-underline"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {status && <span className={`ml-2 font-body text-[11px] ${status.startsWith("Saved") ? "text-green-700" : "text-rust"}`}>{status}</span>}
      </td>
    </tr>
  );
}

export function InsightsTab() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/insights")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Couldn't load insights."));
  }
  useEffect(load, []);

  // Averages from past events that actually have door check-ins.
  const history = useMemo(() => {
    const past = (data?.events ?? []).filter((e) => e.past && e.attended > 0);
    const withMoney = past.filter((e) => e.barPerGuest != null);
    return {
      past,
      showRate: avg(past.filter((e) => e.showRate != null).map((e) => e.showRate!)),
      walkIns: avg(past.map((e) => e.walkIns)),
      attended: avg(past.map((e) => e.attended)),
      barPerGuest: avg(withMoney.map((e) => e.barPerGuest!)),
      expenses: avg(past.filter((e) => e.expenses != null).map((e) => e.expenses!)),
      profit: avg(past.filter((e) => e.profit != null).map((e) => e.profit!)),
      moneyEvents: withMoney.length,
    };
  }, [data]);

  if (error) return <p className="font-body text-sm text-rust">{error}</p>;
  if (!data) return <p className="font-body text-sm text-tan animate-pulse">Loading…</p>;

  const { members, repeat, links, texting } = data;
  // Running totals across every event that has its money filled in.
  const withProfit = data.events.filter((e) => e.profit != null);
  const totals = {
    events: withProfit.length,
    bar: withProfit.reduce((t, e) => t + (e.barRevenue ?? 0), 0),
    other: withProfit.reduce((t, e) => t + (e.otherRevenue ?? 0), 0),
    tickets: withProfit.reduce((t, e) => t + e.ticketRevenue, 0),
    expenses: withProfit.reduce((t, e) => t + (e.expenses ?? 0), 0),
    profit: withProfit.reduce((t, e) => t + e.profit!, 0),
  };
  const linkRows = Object.entries(links);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Members" value={members.approved.toLocaleString()} sub={`${members.pending} pending`} />
        <Card
          label="Avg turnout"
          value={history.attended != null ? Math.round(history.attended).toString() : "—"}
          sub={`across ${history.past.length} past ${history.past.length === 1 ? "event" : "events"}`}
        />
        <Card
          label="RSVP show-up rate"
          value={history.showRate != null ? pct(history.showRate) : "—"}
          sub="of people who RSVP actually come"
        />
        <Card
          label="Repeat guests"
          value={repeat.attendees ? pct(repeat.repeat / repeat.attendees) : "—"}
          sub={`${repeat.repeat} of ${repeat.attendees} members came 2+ times`}
        />
      </div>

      <Section title="Events" note="Attendance is what was checked in at the door, so it may run a little under the real count.">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[40rem] mx-4 sm:mx-0">
            <thead>
              <tr className="border-b border-tan/20">
                {["Event", "RSVPs", "RSVPs who came", "Walk-ins", "Total", "Waitlist", "M / F"].map((h) => (
                  <th key={h} className="font-body text-[10px] tracking-widest uppercase text-tan font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.events].reverse().map((e) => (
                <tr key={e.id} className="border-b border-tan/10 font-body text-sm">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className="text-espresso">{e.title}</span>
                    <span className="block text-[11px] text-tan">
                      {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })}
                      {!e.past && " · upcoming"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-espresso">{e.rsvpPeople}</td>
                  <td className="py-2 pr-3 text-espresso">
                    {e.past ? <>{e.rsvpShowed}{e.showRate != null && <span className="text-tan text-xs"> ({pct(e.showRate)})</span>}</> : <span className="text-tan">—</span>}
                  </td>
                  <td className="py-2 pr-3 text-espresso">{e.past ? e.walkIns : <span className="text-tan">—</span>}</td>
                  <td className="py-2 pr-3 text-espresso font-medium">{e.past ? e.attended : <span className="text-tan">—</span>}</td>
                  <td className="py-2 pr-3 text-espresso">{e.waitlist}</td>
                  <td className="py-2 pr-3 text-tan text-xs whitespace-nowrap">
                    {e.attended ? `${pct(e.gender.male / e.attended)} / ${pct(e.gender.female / e.attended)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Money"
        note="Type in each event's numbers after the night. The site can't see bar sales or costs on its own. Other income = sponsors, etc. Tickets come in automatically (after card fees). Profit (after expenses) is split 65% to us, 35% to Dylan."
      >
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[54rem] mx-4 sm:mx-0">
            <thead>
              <tr className="border-b border-tan/20">
                {["Event", "Bar sales", "Other income", "Tickets", "Expenses", "Profit", `Us (${Math.round(OUR_SHARE * 100)}%)`, `Dylan (${Math.round((1 - OUR_SHARE) * 100)}%)`, ""].map((h) => (
                  <th key={h} className="font-body text-[10px] tracking-widest uppercase text-tan font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.events].filter((e) => e.past).reverse().map((e) => (
                <FinancialsRow key={e.id} event={e} onSaved={load} />
              ))}
            </tbody>
            {totals.events > 0 && (
              <tfoot>
                <tr className="font-body text-sm font-medium text-espresso">
                  <td className="pt-3 pr-3 whitespace-nowrap">
                    Total
                    <span className="block text-[11px] font-normal text-tan">{totals.events} {totals.events === 1 ? "event" : "events"} with numbers</span>
                  </td>
                  <td className="pt-3 pr-3">{money(totals.bar)}</td>
                  <td className="pt-3 pr-3">{money(totals.other)}</td>
                  <td className="pt-3 pr-3">{money(totals.tickets)}</td>
                  <td className="pt-3 pr-3">{money(totals.expenses)}</td>
                  <td className={`pt-3 pr-3 ${totals.profit >= 0 ? "text-green-700" : "text-rust"}`}>{money(totals.profit)}</td>
                  <td className="pt-3 pr-3">{money(totals.profit * OUR_SHARE)}</td>
                  <td className="pt-3 pr-3">{money(totals.profit * (1 - OUR_SHARE))}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {history.moneyEvents > 0 && (
          <p className="font-body text-xs text-tan">
            Average bar spend per guest: <span className="text-espresso">${history.barPerGuest!.toFixed(2)}</span>
            {history.profit != null && <> · average profit per event: <span className="text-espresso">{money(history.profit)}</span></>}
          </p>
        )}
      </Section>

      <Projection history={history} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="New signups per month" note="Everyone who applied that month, whatever their status now.">
          <Bars rows={members.signupsByMonth.map((m) => ({ label: monthLabel(m.month), value: m.count }))} format={(n) => n.toString()} />
        </Section>

        <Section title="Texting costs per month" note="Straight from your Twilio bill — includes carrier fees and the phone number.">
          {texting.monthly ? (
            <Bars rows={texting.monthly.map((m) => ({ label: monthLabel(m.month), value: m.total }))} format={(n) => `$${n.toFixed(2)}`} />
          ) : (
            <p className="font-body text-xs text-tan italic">Couldn&apos;t reach Twilio right now.</p>
          )}
          <div className="pt-2 border-t border-tan/10">
            <p className="font-body text-xs text-tan mb-2">People who replied STOP</p>
            <Bars rows={texting.stopsByMonth.map((m) => ({ label: monthLabel(m.month), value: m.count }))} format={(n) => n.toString()} />
          </div>
        </Section>

        <Section title="Signup page links" note="All events combined, since tracking started Oct 14.">
          {linkRows.length === 0 ? (
            <p className="font-body text-xs text-tan italic">No data yet.</p>
          ) : (
            <table className="w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-tan/20">
                  {["Link", "Visits", "Submitted", "Rate"].map((h) => (
                    <th key={h} className="text-[10px] tracking-widest uppercase text-tan font-medium pb-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkRows.map(([source, t]) => (
                  <tr key={source} className="border-b border-tan/10">
                    <td className="py-1.5 pr-3 text-espresso">{LINK_LABELS[source] ?? source}</td>
                    <td className="py-1.5 pr-3 text-espresso">{t.visits}</td>
                    <td className="py-1.5 pr-3 text-espresso">{t.submits}</td>
                    <td className="py-1.5 pr-3 text-tan">{t.visits ? pct(t.submits / t.visits) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Top referrers" note="Names typed into “Referred by” most often.">
          {members.topReferrers.length === 0 ? (
            <p className="font-body text-xs text-tan italic">No data yet.</p>
          ) : (
            <Bars rows={members.topReferrers.map((r) => ({ label: r.name, value: r.count }))} format={(n) => n.toString()} />
          )}
        </Section>
      </div>
    </div>
  );
}

// "What if" calculator for the next event, prefilled from past averages.
function Projection({ history }: {
  history: { showRate: number | null; walkIns: number | null; barPerGuest: number | null; expenses: number | null; profit: number | null };
}) {
  const [rsvps, setRsvps] = useState(200);
  const [showRate, setShowRate] = useState(Math.round((history.showRate ?? 0.45) * 100));
  const [walkIns, setWalkIns] = useState(Math.round(history.walkIns ?? 50));
  const [barPerGuest, setBarPerGuest] = useState(Math.round(history.barPerGuest ?? FALLBACK_BAR_PER_GUEST));
  const [expenses, setExpenses] = useState(Math.round(history.expenses ?? FALLBACK_EXPENSES));
  const [doorCover, setDoorCover] = useState(0);
  const [doorPayPct, setDoorPayPct] = useState(85);
  const [advanceTickets, setAdvanceTickets] = useState(0);
  const [advancePrice, setAdvancePrice] = useState(15);

  const rsvpArrivals = Math.round(rsvps * (showRate / 100));
  // With a door cover, some walk-ins leave instead of paying.
  const walkInsIn = doorCover > 0 ? Math.round(walkIns * (doorPayPct / 100)) : walkIns;
  const guests = rsvpArrivals + walkInsIn + advanceTickets;
  const bar = guests * barPerGuest;
  const fees = (n: number, price: number) => (price > 0 ? n * (price * CARD_FEE_PCT + CARD_FEE_FLAT) : 0);
  const doorIncome = walkInsIn * doorCover - (doorCover > 0 ? fees(walkInsIn, doorCover) : 0);
  const ticketIncome = advanceTickets * advancePrice - fees(advanceTickets, advancePrice);
  const profit = bar + doorIncome + ticketIncome - expenses;

  return (
    <Section
      title="Next event projection"
      note="Prefilled from your past events — change any number to try out ideas like a door cover or paid tickets."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <NumberInput label="Free RSVPs" value={rsvps} onChange={setRsvps} />
        <NumberInput label="RSVP show-up rate" value={showRate} onChange={setShowRate} suffix="%" />
        <NumberInput label="Walk-ins" value={walkIns} onChange={setWalkIns} />
        <NumberInput label="Bar spend per guest" value={barPerGuest} onChange={setBarPerGuest} prefix="$" />
        <NumberInput label="Expenses" value={expenses} onChange={setExpenses} prefix="$" step={50} />
        <NumberInput label="Door cover (walk-ins)" value={doorCover} onChange={setDoorCover} prefix="$" />
        <NumberInput label="Walk-ins who'd still pay" value={doorPayPct} onChange={setDoorPayPct} suffix="%" />
        <NumberInput label="Paid advance tickets" value={advanceTickets} onChange={setAdvanceTickets} />
        <NumberInput label="Ticket price" value={advancePrice} onChange={setAdvancePrice} prefix="$" />
      </div>
      {history.barPerGuest == null && (
        <p className="font-body text-[11px] text-tan">
          Bar spend and expenses are placeholders until you enter real numbers in the Money section above.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        <Card label="Expected guests" value={guests.toString()} sub={`${rsvpArrivals} RSVPs + ${walkInsIn} walk-ins${advanceTickets ? ` + ${advanceTickets} ticketed` : ""}`} />
        <Card label="Bar sales" value={money(bar)} />
        <Card label="Cover + tickets" value={money(doorIncome + ticketIncome)} sub="after card fees" />
        <Card
          label="Profit"
          value={money(profit)}
          sub={`Us ${money(profit * OUR_SHARE)} · Dylan ${money(profit * (1 - OUR_SHARE))}${history.profit != null ? ` · avg so far ${money(history.profit)}` : ""}`}
        />
      </div>
    </Section>
  );
}
