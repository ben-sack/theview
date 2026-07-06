"use client";
import { useInView } from "@/hooks/useInView";

export function Concept() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";

  return (
    <section
      ref={ref}
      className="min-h-dvh flex flex-col px-6 md:px-16 lg:px-24 border-t border-rust/10 snap-start"
    >
      <div className="max-w-3xl flex-1 flex flex-col justify-between pt-28 pb-14 md:pt-24 md:pb-16 lg:pt-28 lg:pb-20">

        <div>
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
              The crowd is curated. The nights are hard to forget.
            </p>
            <p className="font-body text-cream/40 text-sm leading-loose font-light max-w-xl">
              The View exists because there wasn't a version of this that felt right.
              Now there is.
            </p>
          </div>
        </div>

        <div className={`section-rule reveal reveal-d3 ${v} mt-10 md:mt-10`} />
      </div>
    </section>
  );
}
