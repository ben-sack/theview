"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";

type FormState = {
  name: string;
  email: string;
  phone: string;
  event_type: string;
  event_date: string;
  backup_date: string;
  guest_count: string;
  time_block: string;
  wants_bartender: boolean;
  wants_security: boolean;
  wants_dj: boolean;
  budget_range: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  event_type: "",
  event_date: "",
  backup_date: "",
  guest_count: "",
  time_block: "",
  wants_bartender: false,
  wants_security: false,
  wants_dj: false,
  budget_range: "",
  notes: "",
};

export function BookingsContent() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, type } = e.target;
    const value = type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="relative min-h-screen bg-oxblood overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 15% 0%, rgba(140,60,24,0.24) 0%, transparent 70%), " +
            "radial-gradient(ellipse 45% 40% at 85% 100%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/40 via-transparent to-espresso/60" />

      <div className="relative z-10 px-6 py-16 md:py-24">
        <div className="max-w-xl mx-auto space-y-16 md:space-y-20">
          <div className="space-y-5">
            <a href="/" className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50 hover:text-tan/80 transition-colors">
              ← The View
            </a>
            <div className="space-y-3">
              <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/60">Private Events</p>
              <h1 className="font-display italic text-4xl md:text-5xl text-ivory font-light leading-[1.15]">
                Host your event at The View.
              </h1>
              <p className="font-body text-sm text-cream/50 leading-relaxed max-w-sm">
                A private event space in Santa Monica, available to rent for parties, shoots, and private gatherings.
              </p>
            </div>
          </div>

          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="section-rule" />
                <h2 className="font-body text-[10px] tracking-[0.32em] uppercase text-tan/60">The Space</h2>
              </div>
              <ul className="font-body text-sm text-cream/60 leading-relaxed space-y-2">
                <li>~1,800 sq ft — capacity available on request</li>
                <li>Professional sound system with a DJ booth (Pioneer XDJ-XZ)</li>
                <li>Full bar infrastructure</li>
                <li>Ambient lighting throughout</li>
              </ul>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="section-rule" />
                <h2 className="font-body text-[10px] tracking-[0.32em] uppercase text-tan/60">Add-Ons</h2>
              </div>
              <p className="font-body text-sm text-cream/60 leading-relaxed">
                Bartenders, security, and DJs can all be arranged for your event. You're welcome to bring your own alcohol,
                provided it's served by a licensed bartender — ours or a vetted outside one.
              </p>
            </section>
          </div>

          <section ref={ref} className="pt-2 border-t border-rust/10 space-y-8">
            {submitted ? (
              <div className={`reveal ${v} pt-8`}>
                <p className="font-display italic text-cream/60 text-2xl">
                  Thanks — we'll be in touch.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className={`space-y-6 pt-8 reveal ${v}`} noValidate>
                <div className="space-y-2">
                  <h2 className="font-display italic text-2xl text-ivory font-light">Request a Quote</h2>
                  <p className="font-body text-xs text-cream/40 leading-relaxed">
                    Pricing depends on your date, guest count, and add-ons — tell us about your event and we'll follow up with a quote.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-1">
                    <label htmlFor="name" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Name</label>
                    <input className="field" id="name" name="name" type="text" required value={form.name} onChange={onChange} placeholder="Full name" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Phone</label>
                    <input className="field" id="phone" name="phone" type="tel" required value={form.phone} onChange={onChange} placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Email</label>
                  <input className="field" id="email" name="email" type="email" required value={form.email} onChange={onChange} placeholder="your@email.com" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-1">
                    <label htmlFor="event_type" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Event Type</label>
                    <select className="field" id="event_type" name="event_type" required value={form.event_type} onChange={onChange}>
                      <option value="" disabled>Select one</option>
                      <option value="Private Party">Private Party</option>
                      <option value="Corporate Event">Corporate Event</option>
                      <option value="Photo or Video Shoot">Photo or Video Shoot</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="guest_count" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Guest Count</label>
                    <input className="field" id="guest_count" name="guest_count" type="number" min={1} required value={form.guest_count} onChange={onChange} placeholder="e.g. 80" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-1">
                    <label htmlFor="event_date" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Event Date</label>
                    <input className="field" id="event_date" name="event_date" type="date" required value={form.event_date} onChange={onChange} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="backup_date" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                      Backup Date <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input className="field" id="backup_date" name="backup_date" type="date" value={form.backup_date} onChange={onChange} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="time_block" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                    Time Needed <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
                  </label>
                  <input className="field" id="time_block" name="time_block" type="text" value={form.time_block} onChange={onChange} placeholder="e.g. 6pm–1am" />
                </div>

                <div className="space-y-3">
                  <p className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">Add-Ons</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-cream/60">
                      <input type="checkbox" name="wants_bartender" checked={form.wants_bartender} onChange={onChange} className="w-4 h-4 accent-amber" />
                      Bartender
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-cream/60">
                      <input type="checkbox" name="wants_security" checked={form.wants_security} onChange={onChange} className="w-4 h-4 accent-amber" />
                      Security
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-cream/60">
                      <input type="checkbox" name="wants_dj" checked={form.wants_dj} onChange={onChange} className="w-4 h-4 accent-amber" />
                      DJ
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="budget_range" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                    Budget Range <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
                  </label>
                  <select className="field" id="budget_range" name="budget_range" value={form.budget_range} onChange={onChange}>
                    <option value="">Prefer not to say</option>
                    <option value="Under $2,000">Under $2,000</option>
                    <option value="$2,000–$4,000">$2,000–$4,000</option>
                    <option value="$4,000–$6,000">$4,000–$6,000</option>
                    <option value="$6,000+">$6,000+</option>
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="notes" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                    Anything else? <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
                  </label>
                  <textarea className="field" id="notes" name="notes" rows={3} value={form.notes} onChange={onChange} placeholder="Tell us more about your event" />
                </div>

                {error && <p className="font-body text-[9px] tracking-[0.2em] text-rust/80">{error}</p>}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex items-center gap-5 font-body text-[10px] tracking-[0.3em] uppercase text-cream/55 hover:text-cream/90 transition-colors duration-300 py-2 pr-2 -ml-1 pl-1 disabled:opacity-40"
                  >
                    <span>{loading ? "Sending…" : "Request Quote"}</span>
                    <span className="block h-px w-8 bg-rust/40 group-hover:w-14 group-hover:bg-amber/60 transition-all duration-400" />
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
