"use client";
import { useInView } from "@/hooks/useInView";

export function Music() {
  const { ref, inView } = useInView<HTMLElement>();
  const v = inView ? "in-view" : "";

  return (
    <section
      ref={ref}
      className="py-20 md:py-36 lg:py-48 px-6 md:px-16 lg:px-24 border-t border-rust/10 md:snap-start"
    >
      <div className="max-w-5xl">
        <div>
          <div>
            <p className={`font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-14 reveal ${v}`}>
              The Sound
            </p>

            <div className={`space-y-6 reveal reveal-d1 ${v}`}>
              <p className="font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.2]">
                Music is not the backdrop here.
              </p>
              <p className="font-display text-[1.75rem] md:text-[2.25rem] text-cream/55 font-light leading-[1.2] italic">
                It's the reason.
              </p>
            </div>

            <div className={`mt-10 space-y-4 reveal reveal-d2 ${v}`}>
              <p className="font-body text-cream/55 text-base leading-loose font-light max-w-lg">
                Each evening is shaped around a single point of view — one arc of
                sound, one room. We don't book performers. We invite people who
                have something to say.
              </p>
              <p className="font-body text-cream/35 text-sm leading-loose font-light">
                Genre doesn't matter. Intention does.
              </p>
            </div>
          </div>


        </div>
      </div>
    </section>
  );
}
