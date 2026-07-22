"use client";
import { useInView } from "@/hooks/useInView";

export function HowAccess() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";

  return (
    <section
      ref={ref}
      className="min-h-dvh flex flex-col px-6 md:px-16 lg:px-24 border-t border-rust/10 snap-start"
    >
      <div className="max-w-2xl flex-1 flex flex-col justify-between pt-24 pb-10 md:pt-24 md:pb-16 lg:pt-28 lg:pb-20">

        <div>
          <p className={`font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-8 reveal ${v}`}>
            How It Works
          </p>

          <p className={`font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.2] reveal reveal-d1 ${v}`}>
            Most people arrive by introduction.
          </p>

          <div className={`mt-8 space-y-3 reveal reveal-d2 ${v}`}>
            <p className="font-body text-cream/55 text-base leading-relaxed font-light">
              Someone in the community knows them. Felt they belonged. That's how
              the room stays right.
            </p>
            <p className="font-body text-cream/45 text-base leading-relaxed font-light">
              If you're coming through a different door — you found this on your
              own, or someone sent it to you — you're welcome to reach out. Tell us
              a little about yourself. There's no formula.
            </p>
            <p className="font-body text-cream/35 text-base leading-relaxed font-light">
              We're looking for genuine interest and a real connection to the kind
              of night this is.
            </p>
          </div>

          <div className={`mt-10 reveal reveal-d3 ${v}`}>
            <p className="font-body text-[10px] tracking-[0.25em] uppercase text-tan/40 mb-1">
              Gatherings are
            </p>
            <p className="font-display italic text-cream/40 text-lg">
              intentional, intimate, and by invitation.
            </p>
          </div>

          <p className={`mt-6 font-body text-[10px] tracking-[0.2em] text-cream/30 leading-relaxed reveal reveal-d4 ${v}`}>
            The View is a private, invitation-based event community in Los Angeles.
          </p>
        </div>

        <div className={`section-rule reveal reveal-d4 ${v} mt-6 md:mt-10`} />

      </div>
    </section>
  );
}
