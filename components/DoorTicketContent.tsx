"use client";
import { useEffect, useState } from "react";
import { normalizePhone, isUSPhoneNumber } from "@/lib/phone";
import { formatCents } from "@/lib/tickets";

type Done =
  | { kind: "paid" | "in"; name: string | null; detail: string }
  | { kind: "already"; name: string | null }
  | { kind: "sold_out" }
  | { kind: "see_staff" };

const labelClass = "font-body text-[10px] tracking-[0.25em] uppercase text-cream/50";

// The page behind the door QR code: a walk-in buys a ticket on their own
// phone, then shows the big confirmation screen to the door.
export function DoorTicketContent({
  slug,
  title,
  open,
  priceCents,
  tierName,
}: {
  slug: string;
  title: string;
  open: boolean;
  priceCents: number | null;
  tierName: string | null;
}) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [smsChoice, setSmsChoice] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("paid");
    const canceled = params.get("canceled");
    if (!sessionId && !canceled) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (canceled) {
      setNotice("Payment canceled — you weren't charged.");
      fetch("/api/tickets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: canceled }),
      }).catch(() => {});
      return;
    }
    setLoading(true);
    fetch(`/api/tickets/confirm?session_id=${encodeURIComponent(sessionId!)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.order?.status === "paid") {
          setDone({
            kind: "paid",
            name: d.order.buyerName,
            detail: `Paid ${formatCents(d.order.amountCents + d.order.feeCents)}${d.order.tierName ? ` · ${d.order.tierName}` : ""}`,
          });
        } else {
          setNotice("We couldn't confirm your payment yet. If you were charged, show your email receipt to the door.");
        }
      })
      .catch(() => setNotice("We couldn't confirm your payment yet. If you were charged, show your email receipt to the door."))
      .finally(() => setLoading(false));
  }, []);

  // Live clock on the confirmation, so a screenshot can't pass for it.
  useEffect(() => {
    if (!done || (done.kind !== "paid" && done.kind !== "in")) return;
    const tick = () => setNow(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [done]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Please fill out all fields.");
      return;
    }
    if (!isUSPhoneNumber(normalizePhone(form.phone))) {
      setError("Sorry, we only accept US phone numbers at the moment.");
      return;
    }
    if (smsChoice === null) {
      setError("Please let us know if we can text you.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/event-signup/${slug}/door`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sms_opt_in: smsChoice === "yes" }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Something went wrong. Please try again."); return; }
      if (d.result === "checkout") { window.location.href = d.checkout_url; return; }
      if (d.result === "in") setDone({ kind: "in", name: d.name, detail: d.tierName ?? "Free entry" });
      else if (d.result === "already_on_list") setDone({ kind: "already", name: d.name });
      else if (d.result === "sold_out") setDone({ kind: "sold_out" });
      else setDone({ kind: "see_staff" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done && (done.kind === "paid" || done.kind === "in")) {
    return (
      <main className="min-h-screen bg-green-700 text-white flex flex-col items-center justify-center px-6 text-center">
        <p className="font-body text-xs tracking-[0.4em] uppercase text-white/80">{title}</p>
        <p className="font-display text-7xl font-light mt-4">{done.kind === "paid" ? "PAID ✓" : "YOU'RE IN ✓"}</p>
        <p className="font-display text-4xl font-light mt-6">{done.name}</p>
        <p className="font-body text-sm text-white/85 mt-2">{done.detail}</p>
        <p className="font-mono text-2xl mt-8 tabular-nums">{now}</p>
        <p className="font-body text-xs text-white/70 mt-6">Show this screen at the door.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-espresso text-cream px-4 py-10 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <p className="font-body text-[10px] tracking-[0.4em] uppercase text-tan/60">The View · Door</p>
          <h1 className="font-display text-5xl text-ivory font-light leading-tight">{title}</h1>
        </div>

        {done ? (
          <div className="rounded-lg border border-rust/25 p-6 text-center space-y-2">
            {done.kind === "already" ? (
              <>
                <p className="font-display text-3xl text-ivory font-light">You&apos;re on the list.</p>
                <p className="font-body text-sm text-cream/60">{done.name ? `${done.name} — ` : ""}just give your name at the door.</p>
              </>
            ) : done.kind === "sold_out" ? (
              <>
                <p className="font-display text-3xl text-ivory font-light">Sold out.</p>
                <p className="font-body text-sm text-cream/60">Door tickets are gone for tonight. Check with the door.</p>
              </>
            ) : (
              <>
                <p className="font-display text-3xl text-ivory font-light">Please see the door.</p>
                <p className="font-body text-sm text-cream/60">We can&apos;t sell you a ticket here — someone at the door can help.</p>
              </>
            )}
          </div>
        ) : !open || priceCents == null ? (
          <div className="rounded-lg border border-rust/25 p-6 text-center">
            <p className="font-display text-3xl text-ivory font-light">No door tickets right now.</p>
            <p className="font-body text-sm text-cream/60 mt-2">Check with the door.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="rounded-lg border border-rust/25 p-6 space-y-3" noValidate style={{ background: "rgba(37,8,12,0.65)" }}>
            <div className="text-center pb-2">
              <p className="font-display text-4xl text-ivory font-light">{priceCents === 0 ? "Free" : formatCents(priceCents)}</p>
              {tierName && <p className="font-body text-[10px] tracking-[0.25em] uppercase text-cream/45 mt-1">{tierName}</p>}
              <p className="font-body text-[11px] text-cream/45 mt-2">On the list already? Enter your number — you won&apos;t be charged.</p>
            </div>

            {notice && <p className="font-body text-xs text-cream/70 border border-rust/30 rounded px-3 py-2">{notice}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="first_name" className={labelClass}>First Name</label>
                <input className="field" id="first_name" autoComplete="given-name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="First" />
              </div>
              <div className="space-y-1">
                <label htmlFor="last_name" className={labelClass}>Last Name</label>
                <input className="field" id="last_name" autoComplete="family-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Last" />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="phone" className={labelClass}>Phone</label>
              <input className="field" id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" />
            </div>
            <div className="space-y-1">
              <label htmlFor="email" className={labelClass}>Email (for your receipt)</label>
              <input className="field" id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
            </div>

            {/* SMS consent — keep word-for-word in sync with AccessForm (Twilio-approved opt-in) */}
            <div className="space-y-2 pt-1">
              <p className={labelClass}>Can we text you?</p>
              <div className="flex gap-2" role="radiogroup" aria-label="SMS opt-in">
                {(["yes", "no"] as const).map((choice) => (
                  <label
                    key={choice}
                    className={`flex-1 text-center rounded-sm border py-2 px-2 cursor-pointer transition-colors font-body text-[10px] tracking-[0.15em] uppercase ${
                      smsChoice === choice ? "border-amber/70 bg-amber/10 text-cream/90" : "border-rust/25 text-cream/40 hover:border-rust/40"
                    }`}
                  >
                    <input type="radio" name="sms_opt_in" value={choice} checked={smsChoice === choice} onChange={() => setSmsChoice(choice)} className="sr-only" />
                    {choice === "yes" ? "Yes, text me" : "No thanks"}
                  </label>
                ))}
              </div>
              <p className="font-body text-[10px] tracking-[0.15em] text-cream/50 leading-relaxed">
                This is how we notify you if you&apos;re approved and invite you to events — without it, we can&apos;t reach you.
              </p>
            </div>

            {error && <p className="font-body text-[10px] tracking-[0.2em] text-rust">{error}</p>}

            <p className="font-body text-[10px] tracking-[0.15em] text-cream/55 leading-relaxed">
              Message and data rates may apply. Reply STOP to any text to opt out at any time. See our{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-cream/70 transition-colors">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-ivory text-espresso font-body text-sm font-medium tracking-[0.25em] uppercase py-4 rounded hover:bg-cream transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? "One sec…" : priceCents === 0 ? "Get in" : `Pay ${formatCents(priceCents)}`}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
