"use client";
import { useEffect, useState } from "react";
import { formatCents, type TierWithCounts, type TierAudience, type TierChannel } from "@/lib/tickets";

type Order = {
  id: string;
  name: string | null;
  tier_name: string | null;
  channel: string;
  status: "paid" | "free" | "cash" | "refunded";
  amount_cents: number;
  fee_cents: number;
  net_cents: number;
  created_at: string;
};

type EditTier = {
  id?: string;
  name: string;
  price: string; // dollars, as typed
  quantity: string; // blank = unlimited
  audience: TierAudience;
  channel: TierChannel;
  ends_at: string; // datetime-local value, blank = none
  sold: number;
  held: number;
};

const blankTier = (name = "", price = "", quantity = ""): EditTier => ({
  name, price, quantity, audience: "anyone", channel: "online", ends_at: "", sold: 0, held: 0,
});

// Quick starting points — every field stays editable after.
const PRESETS: { label: string; tiers: () => EditTier[] }[] = [
  {
    label: "Free, then paid",
    tiers: () => [blankTier("Free list", "0", "50"), blankTier("General", "15", "")],
  },
  {
    label: "Rising prices",
    tiers: () => [
      blankTier("Early bird", "5", "20"),
      blankTier("Round 2", "10", "50"),
      blankTier("Round 3", "15", "50"),
      blankTier("Final", "20", ""),
    ],
  },
  {
    label: "Members free, door cover",
    tiers: () => [
      { ...blankTier("Members", "0", ""), audience: "members" },
      { ...blankTier("Door", "20", ""), channel: "door" },
    ],
  },
];

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass =
  "w-full bg-ivory border border-tan/30 rounded px-2 py-1.5 font-body text-sm text-black placeholder-tan/40 focus:outline-none focus:border-rust";

export function TicketsBox({ eventId, signupLive, hasSlug }: { eventId: string; signupLive: boolean; hasSlug: boolean }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [mode, setMode] = useState<"test" | "live">("test");
  const [enabled, setEnabled] = useState(false);
  const [feeToBuyer, setFeeToBuyer] = useState(false);
  const [tiers, setTiers] = useState<EditTier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [doorUrl, setDoorUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);

  function load() {
    fetch(`/api/admin/events/${eventId}/tickets`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setStatus({ ok: false, text: d.error }); setLoaded(true); return; }
        setAvailable(d.available);
        setMode(d.stripeMode);
        setEnabled(d.tickets_enabled);
        setFeeToBuyer(d.ticket_fee_to_buyer);
        setTiers(
          (d.tiers as TierWithCounts[]).map((t) => ({
            id: t.id,
            name: t.name,
            price: String(t.price_cents / 100),
            quantity: t.quantity == null ? "" : String(t.quantity),
            audience: t.audience,
            channel: t.channel,
            ends_at: toLocalInput(t.ends_at),
            sold: t.sold,
            held: t.held,
          }))
        );
        setOrders(d.orders ?? []);
        setDoorUrl(d.doorUrl);
        setQr(d.qr);
        setLoaded(true);
      });
  }
  useEffect(load, [eventId]);

  function update(i: number, patch: Partial<EditTier>) {
    setTiers((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }
  function move(i: number, dir: -1 | 1) {
    setTiers((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save(nextEnabled = enabled) {
    setStatus(null);
    const payload = tiers.map((t) => ({
      id: t.id,
      name: t.name,
      price_cents: Math.round(Number(t.price || 0) * 100),
      quantity: t.quantity.trim() === "" ? null : Number(t.quantity),
      audience: t.audience,
      channel: t.channel,
      ends_at: t.ends_at ? new Date(t.ends_at).toISOString() : null,
    }));
    if (payload.some((t) => !Number.isFinite(t.price_cents) || (t.quantity != null && !Number.isInteger(t.quantity)))) {
      setStatus({ ok: false, text: "Check prices and quantities — they must be numbers." });
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/events/${eventId}/tickets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickets_enabled: nextEnabled, ticket_fee_to_buyer: feeToBuyer, tiers: payload }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setStatus({ ok: false, text: d.error ?? "Failed to save." }); return; }
    setEnabled(nextEnabled);
    setStatus({ ok: true, text: nextEnabled !== enabled ? (nextEnabled ? "Tickets are on." : "Tickets are off — signups are free again.") : "Saved." });
    load();
  }

  async function refund(o: Order) {
    const what = o.status === "paid" ? `refund ${formatCents(o.amount_cents + o.fee_cents)} to their card` : "mark this ticket refunded";
    if (!confirm(`This will ${what} and take ${o.name ?? "them"} off the guest list. Continue?`)) return;
    setRefunding(o.id);
    const res = await fetch("/api/admin/tickets/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: o.id }),
    });
    const d = await res.json().catch(() => ({}));
    setRefunding(null);
    if (!res.ok) { alert(d.error ?? "Refund failed."); return; }
    load();
  }

  function printQr() {
    if (!qr) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><title>Door tickets</title><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h1 style="font-size:48px;margin:0 0 8px">Tickets</h1>
      <p style="font-size:22px;margin:0 0 24px">Scan to get in</p>
      <img src="${qr}" style="width:420px;height:420px" />
      <p style="font-size:16px;color:#555">On the list? Just give your name at the door.</p>
      <script>onload=()=>print()</script></body>`);
    w.document.close();
  }

  const live = orders.filter((o) => o.status !== "refunded");
  const gross = live.reduce((s, o) => s + o.amount_cents + o.fee_cents, 0);
  const net = live.reduce((s, o) => s + o.net_cents, 0);
  const paidCount = live.filter((o) => o.status === "paid" || o.status === "cash").length;
  const freeCount = live.filter((o) => o.status === "free").length;

  return (
    <div className="bg-white rounded-lg border border-tan/20 shadow-sm p-4 sm:p-6 space-y-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2">
          <span className="font-body text-sm font-medium text-espresso">Tickets</span>
          <span className={`font-body text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${enabled && available ? "bg-green-50 text-green-700" : "bg-tan/10 text-tan"}`}>
            {enabled && available ? "On" : "Off"}
          </span>
          {loaded && mode === "test" && (
            <span className="font-body text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber/10 text-amber">Test mode</span>
          )}
          {live.length > 0 && <span className="font-body text-xs text-tan">{paidCount} paid · {formatCents(gross)}</span>}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-tan transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && !loaded && <p className="font-body text-sm text-tan animate-pulse">Loading…</p>}

      {open && loaded && (
        <>
          <p className="font-body text-xs text-tan -mt-2">
            Off by default — this event&apos;s signups stay free until you turn tickets on. Tiers sell top to bottom: when one sells out or its end date passes, the next one opens.
          </p>

          {!available && (
            <p className="font-body text-xs text-rust">Ticketing is turned off site-wide (Settings tab), so nothing here applies right now.</p>
          )}
          {mode === "test" && (
            <p className="font-body text-xs text-amber bg-amber/5 border border-amber/20 rounded px-3 py-2">
              Test mode — no real money moves. To try checkout, pay with card <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC and ZIP.
            </p>
          )}
          {enabled && !signupLive && (
            <p className="font-body text-xs text-tan">Online tickets sell through the Public Signup Page, which is off — turn it on for online sales. The door QR works either way.</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-body text-xs font-medium text-espresso">Tiers</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-body text-[11px] text-tan">Start from:</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (tiers.length && !confirm("Replace the current tiers with this preset?")) return;
                      setTiers(p.tiers());
                    }}
                    className="font-body text-[11px] px-2 py-1 border border-tan/40 rounded hover:border-rust transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {tiers.length === 0 && <p className="font-body text-xs text-tan italic">No tiers yet — add one or start from a preset.</p>}

            {tiers.map((t, i) => (
              <div key={t.id ?? `new-${i}`} className="border border-tan/20 rounded p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-[11px] text-tan">
                    Tier {i + 1}
                    {(t.sold > 0 || t.held > 0) && ` · ${t.sold} sold${t.held ? `, ${t.held} in checkout` : ""}`}
                  </span>
                  <span className="flex items-center gap-2 font-body text-xs">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-tan hover:text-rust disabled:opacity-30" aria-label="Move up">↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === tiers.length - 1} className="text-tan hover:text-rust disabled:opacity-30" aria-label="Move down">↓</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (t.sold > 0 && !confirm(`"${t.name}" has ${t.sold} sold. Remove the tier anyway? Those tickets stay valid.`)) return;
                        setTiers((prev) => prev.filter((_, j) => j !== i));
                      }}
                      className="text-rust hover:underline"
                    >
                      Remove
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <label className="col-span-2 space-y-0.5">
                    <span className="font-body text-[10px] text-tan">Name</span>
                    <input className={inputClass} value={t.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. Early bird" />
                  </label>
                  <label className="space-y-0.5">
                    <span className="font-body text-[10px] text-tan">Price ($0 = free)</span>
                    <input className={inputClass} inputMode="decimal" value={t.price} onChange={(e) => update(i, { price: e.target.value })} placeholder="0" />
                  </label>
                  <label className="space-y-0.5">
                    <span className="font-body text-[10px] text-tan">How many</span>
                    <input className={inputClass} inputMode="numeric" value={t.quantity} onChange={(e) => update(i, { quantity: e.target.value })} placeholder="Unlimited" />
                  </label>
                  <label className="space-y-0.5">
                    <span className="font-body text-[10px] text-tan">Who</span>
                    <select className={inputClass} value={t.audience} onChange={(e) => update(i, { audience: e.target.value as TierAudience })}>
                      <option value="anyone">Anyone</option>
                      <option value="members">Members only</option>
                    </select>
                  </label>
                  <label className="space-y-0.5">
                    <span className="font-body text-[10px] text-tan">Where</span>
                    <select className={inputClass} value={t.channel} onChange={(e) => update(i, { channel: e.target.value as TierChannel })}>
                      <option value="online">Online</option>
                      <option value="door">Door (QR)</option>
                      <option value="both">Both</option>
                    </select>
                  </label>
                  <label className="col-span-2 sm:col-span-3 space-y-0.5">
                    <span className="font-body text-[10px] text-tan">Ends (optional)</span>
                    <input type="datetime-local" className={inputClass} value={t.ends_at} onChange={(e) => update(i, { ends_at: e.target.value })} />
                  </label>
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setTiers((prev) => [...prev, blankTier()])} className="font-body text-xs text-rust hover:underline">
              + Add tier
            </button>
          </div>

          <label className="flex items-start gap-2 font-body text-xs text-espresso cursor-pointer">
            <input type="checkbox" checked={feeToBuyer} onChange={(e) => setFeeToBuyer(e.target.checked)} className="mt-0.5" />
            <span>
              Buyer pays the card fee
              <span className="block text-tan">Off: buyers pay exactly the ticket price and we cover Stripe&apos;s ~2.9% + 30¢. On: the fee is added at checkout.</span>
            </span>
          </label>

          {status && <p className={`font-body text-xs ${status.ok ? "text-green-700" : "text-rust"}`}>{status.text}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => save()}
              disabled={saving}
              className="font-body text-sm font-medium px-5 py-2.5 border border-espresso text-espresso rounded hover:bg-espresso hover:text-ivory transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                if (!enabled && !confirm("Turn tickets on? The signup page will start using these tiers right away.")) return;
                save(!enabled);
              }}
              disabled={saving}
              className="font-body text-sm font-medium px-6 py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
            >
              {enabled ? "Save & Turn Off" : "Save & Turn On"}
            </button>
          </div>

          {/* Door QR */}
          <div className="border-t border-tan/15 pt-4 space-y-2">
            <p className="font-body text-xs font-medium text-espresso">Door QR code</p>
            {!hasSlug ? (
              <p className="font-body text-xs text-tan">Give the Public Signup Page a link name first — the door page lives at that link + /door.</p>
            ) : (
              <div className="flex items-start gap-4 flex-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr && <img src={qr} alt="Door ticket QR code" className="w-32 h-32 border border-tan/20 rounded" />}
                <div className="space-y-2 font-body text-xs">
                  <p className="text-tan">Print it for the entrance. Walk-ins scan, pay on their phone, and show a green PAID screen. They&apos;re added to the guest list as checked in. Only tiers set to Door or Both sell here.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={printQr} className="text-rust hover:underline">Print sign</button>
                    {doorUrl && <a href={doorUrl} target="_blank" rel="noopener noreferrer" className="text-rust hover:underline">Open door page</a>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sales */}
          <div className="border-t border-tan/15 pt-4 space-y-2">
            <p className="font-body text-xs font-medium text-espresso">
              Sales · {paidCount} paid{freeCount ? `, ${freeCount} free` : ""} · {formatCents(gross)} collected · ~{formatCents(net)} after card fees
            </p>
            {orders.length === 0 ? (
              <p className="font-body text-xs text-tan italic">No tickets yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-tan/20 rounded divide-y divide-tan/10">
                {orders.map((o) => (
                  <div key={o.id} className="px-3 py-2 flex items-center justify-between gap-3 font-body text-sm">
                    <span className="min-w-0">
                      <span className={`text-espresso ${o.status === "refunded" ? "line-through text-tan" : ""}`}>{o.name ?? "Guest"}</span>
                      <span className="block text-[11px] text-tan">
                        {o.tier_name ?? "—"} · {o.channel === "door" ? "Door" : "Online"} ·{" "}
                        {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="text-espresso">
                        {o.status === "free" ? "Free" : o.status === "refunded" ? "Refunded" : `${formatCents(o.amount_cents + o.fee_cents)}${o.status === "cash" ? " cash" : ""}`}
                      </span>
                      {o.status !== "refunded" && (
                        <button type="button" onClick={() => refund(o)} disabled={refunding === o.id} className="text-rust hover:underline disabled:opacity-40">
                          {refunding === o.id ? "…" : o.status === "free" ? "Remove" : "Refund"}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
