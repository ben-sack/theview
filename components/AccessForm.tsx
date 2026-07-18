"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInView } from "@/hooks/useInView";

type FormState = {
  name: string;
  email: string;
  phone: string;
  ig_handle: string;
  referred_by: string;
};

type SmsChoice = "yes" | "no" | null;

export function AccessForm() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    ig_handle: "",
    referred_by: "",
  });

  useEffect(() => {
    const refParam = searchParams.get("ref");
    const applyParam = searchParams.get("apply");

    if (applyParam) {
      setTimeout(() => {
        document.getElementById("access")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }

    if (!refParam) return;
    fetch(`/api/referrer?id=${refParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.name) setForm((prev) => ({ ...prev, referred_by: d.name }));
      });
    setTimeout(() => {
      document.getElementById("access")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  }, [searchParams]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [smsChoice, setSmsChoice] = useState<SmsChoice>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (smsChoice === null) {
      setError("Please let us know if we can text you before submitting.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sms_opt_in: smsChoice === "yes" }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }

    router.push("/confirmed");
  }

  return (
    <section
      id="access"
      ref={ref}
      className="pt-14 pb-2 md:pt-10 md:pb-4 lg:pt-12 lg:pb-6 px-6 md:px-16 lg:px-24 border-t border-rust/10 flex-1 flex items-center"
      style={{ background: "rgba(20,4,7,0.45)" }}
    >
      <div className="max-w-lg w-full">

        <p className={`hidden md:block font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-3 md:mb-2 reveal ${v}`}>
          Request Access
        </p>

        <h2 className={`font-display text-2xl md:text-[2.75rem] text-ivory font-light leading-[1.2] mt-2 md:mt-0 mb-4 md:mb-6 reveal reveal-d1 ${v}`}>
          Let's see if it's
          <br />
          <span className="italic text-cream/50">a good fit.</span>
        </h2>

        {submitted ? (
          <div className={`reveal ${v}`}>
            <p className="font-display italic text-cream/60 text-2xl">
              You're on the list — we'll be in touch.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className={`space-y-2 md:space-y-3 reveal reveal-d2 ${v}`} noValidate>

            <div className="space-y-1">
              <label htmlFor="name" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Name
              </label>
              <input
                className="field"
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={onChange}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Email
              </label>
              <input
                className="field"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={onChange}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="phone" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Phone
              </label>
              <input
                className="field"
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                value={form.phone}
                onChange={onChange}
                placeholder="(555) 000-0000"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="ig_handle" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Instagram
              </label>
              <input
                className="field"
                id="ig_handle"
                name="ig_handle"
                type="text"
                required
                value={form.ig_handle}
                onChange={onChange}
                placeholder="@handle"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="referred_by" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Referred by{" "}
                <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
              </label>
              <input
                className="field"
                id="referred_by"
                name="referred_by"
                type="text"
                value={form.referred_by}
                onChange={onChange}
                placeholder="Name or @handle"
              />
            </div>

            <div className="space-y-2 pt-1">
              <p className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Can we text you?
              </p>
              <div className="flex gap-2" role="radiogroup" aria-label="SMS opt-in">
                <label
                  className={`flex-1 text-center rounded-sm border py-2 px-2 cursor-pointer transition-colors font-body text-[10px] tracking-[0.15em] uppercase ${
                    smsChoice === "yes"
                      ? "border-amber/70 bg-amber/10 text-cream/90"
                      : "border-rust/25 text-cream/40 hover:border-rust/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="sms_opt_in"
                    value="yes"
                    checked={smsChoice === "yes"}
                    onChange={() => setSmsChoice("yes")}
                    className="sr-only"
                  />
                  Yes, text me
                </label>
                <label
                  className={`flex-1 text-center rounded-sm border py-2 px-2 cursor-pointer transition-colors font-body text-[10px] tracking-[0.15em] uppercase ${
                    smsChoice === "no"
                      ? "border-amber/70 bg-amber/10 text-cream/90"
                      : "border-rust/25 text-cream/40 hover:border-rust/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="sms_opt_in"
                    value="no"
                    checked={smsChoice === "no"}
                    onChange={() => setSmsChoice("no")}
                    className="sr-only"
                  />
                  No thanks
                </label>
              </div>
              <p className="font-body text-[9px] tracking-[0.15em] text-cream/50 leading-relaxed">
                This is how we notify you if you&apos;re approved and invite you to future events — without it, we won&apos;t be able to reach you.
              </p>
            </div>

            {error && (
              <p className="font-body text-[9px] tracking-[0.2em] text-rust/80">{error}</p>
            )}

            <p className="font-body text-[10px] tracking-[0.15em] text-cream/55 leading-relaxed">
              Message and data rates may apply. Reply STOP to any text to opt out at any time. See our{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-cream/70 transition-colors">
                Privacy Policy
              </a>.
            </p>

            <div className="pt-2 md:pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex items-center gap-5 font-body text-[10px] tracking-[0.3em] uppercase text-cream/55 hover:text-cream/90 transition-colors duration-300 py-2 md:py-3 pr-2 -ml-1 pl-1 disabled:opacity-40"
              >
                <span>{loading ? "Sending…" : "Send"}</span>
                <span className="block h-px w-8 bg-rust/40 group-hover:w-14 group-hover:bg-amber/60 transition-all duration-400" />
              </button>
            </div>

          </form>
        )}

        {/* Secondary CTA */}
        <div className={`mt-2 pt-1 md:mt-2 md:pt-3 border-t border-rust/10 reveal reveal-d4 ${v}`}>
          <a
            href="https://www.instagram.com/theview.la/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[9px] tracking-[0.32em] uppercase text-tan/45 hover:text-tan/75 transition-colors"
          >
            Follow on Instagram
          </a>
        </div>

      </div>
    </section>
  );
}
