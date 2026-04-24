"use client";
import { useInView } from "@/hooks/useInView";

export function HowAccess() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";

  return (
    <section
      ref={ref}
      className="py-20 md:py-36 lg:py-48 px-6 md:px-16 lg:px-24 border-t border-rust/10 md:snap-start"
    >
      <div className="max-w-2xl">

        <p className={`font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-14 reveal ${v}`}>
          How It Works
        </p>

        <p className={`font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.2] reveal reveal-d1 ${v}`}>
          Most people arrive by introduction.
        </p>

        <div className={`mt-10 space-y-5 reveal reveal-d2 ${v}`}>
          <p className="font-body text-cream/55 text-base leading-loose font-light">
            Someone in the community knows them. Felt they belonged. That's how
            the room stays right.
          </p>
          <p className="font-body text-cream/45 text-base leading-loose font-light">
            If you're coming through a different door — you found this on your
            own, or someone sent it to you — you're welcome to reach out. Tell us
            a little about yourself. There's no formula.
          </p>
          <p className="font-body text-cream/35 text-base leading-loose font-light">
            We're looking for genuine interest and a real connection to the kind
            of night this is.
          </p>
        </div>

        <div className={`mt-14 reveal reveal-d3 ${v}`}>
          <p className="font-body text-[10px] tracking-[0.25em] uppercase text-tan/40 mb-1">
            Gatherings are
          </p>
          <p className="font-display italic text-cream/40 text-lg">
            recurring, unannounced, and kept small.
          </p>
        </div>

      </div>
    </section>
  );
}
