"use client";
import { useInView } from "@/hooks/useInView";

export function Concept() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";

  return (
    <section
      ref={ref}
      className="py-20 md:py-36 lg:py-48 px-6 md:px-16 lg:px-24 border-t border-rust/10 md:snap-start"
    >
      <div className="max-w-3xl">

        <p className={`font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-14 reveal ${v}`}>
          The Concept
        </p>

        <div className={`space-y-7 reveal reveal-d1 ${v}`}>
          <p className="font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.25]">
            A recurring evening in Los Angeles.
          </p>
          <p className="font-display text-[1.75rem] md:text-[2.25rem] text-cream/65 font-light leading-[1.25]">
            Hosted in private spaces. Built around music.
            Kept small.
          </p>
        </div>

        <div className={`mt-10 space-y-4 reveal reveal-d2 ${v}`}>
          <p className="font-body text-cream/55 text-base md:text-lg leading-loose font-light max-w-xl">
            No production. No guestlist politics. A room of people who take
            listening seriously.
          </p>
          <p className="font-body text-cream/40 text-base leading-loose font-light max-w-xl">
            The View exists because there wasn't a version of this that felt right.
            Now there is.
          </p>
        </div>

        <div className={`mt-16 section-rule reveal reveal-d3 ${v}`} />
      </div>
    </section>
  );
}
