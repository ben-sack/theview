"use client";
import { useState } from "react";
import { useInView } from "@/hooks/useInView";

type FormState = {
  name: string;
  email: string;
  instagram: string;
  note: string;
};

export function AccessForm() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";

  const [form, setForm] = useState<FormState>({ name: "", email: "", instagram: "", note: "" });
  const [submitted, setSubmitted] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: connect to form backend (e.g. Resend, Formspree, or custom API route)
    console.log("Access request:", form);
    setSubmitted(true);
  }

  return (
    <section
      id="access"
      ref={ref}
      className="py-20 md:py-36 lg:py-48 px-6 md:px-16 lg:px-24 border-t border-rust/10 md:snap-start"
      style={{ background: "rgba(20,4,7,0.45)" }}
    >
      <div className="max-w-lg">

        <p className={`font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-8 reveal ${v}`}>
          Request Access
        </p>

        <h2 className={`font-display text-[2rem] md:text-[3.25rem] text-ivory font-light leading-[1.2] mb-10 md:mb-14 reveal reveal-d1 ${v}`}>
          Let's see if it's
          <br />
          <span className="italic text-cream/50">a good fit.</span>
        </h2>

        {submitted ? (
          <div className={`reveal ${v}`}>
            <p className="font-display italic text-cream/60 text-2xl">
              We'll be in touch.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className={`space-y-8 reveal reveal-d2 ${v}`} noValidate>

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
              <label htmlFor="instagram" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Instagram{" "}
                <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
              </label>
              <input
                className="field"
                id="instagram"
                name="instagram"
                type="text"
                value={form.instagram}
                onChange={onChange}
                placeholder="@handle"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="note" className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                A short note{" "}
                <span className="text-cream/20 normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                className="field"
                id="note"
                name="note"
                rows={4}
                value={form.note}
                onChange={onChange}
                placeholder="How did you find this? What's your relationship to music?"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="group inline-flex items-center gap-5 font-body text-[10px] tracking-[0.3em] uppercase text-cream/55 hover:text-cream/90 transition-colors duration-300 py-3 pr-2 -ml-1 pl-1"
              >
                <span>Send</span>
                <span className="block h-px w-8 bg-rust/40 group-hover:w-14 group-hover:bg-amber/60 transition-all duration-400" />
              </button>
            </div>

          </form>
        )}

        {/* Secondary CTA */}
        <div className={`mt-20 pt-10 border-t border-rust/10 reveal reveal-d4 ${v}`}>
          <a
            href="https://instagram.com/theview.losangeles"
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
