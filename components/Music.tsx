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
        <div className="grid md:grid-cols-[1fr_auto] gap-16 md:gap-32 items-start">

          {/* Copy */}
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

          {/* Vinyl / playlist placeholder */}
          <div className={`flex-shrink-0 flex justify-center md:justify-start reveal reveal-d3 ${v}`}>
            <div
              className="w-52 h-52 md:w-64 md:h-64 flex flex-col items-center justify-center gap-5"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(80,24,12,0.7) 0%, rgba(37,8,12,0.9) 100%)",
                border: "1px solid rgba(122,46,30,0.2)",
              }}
            >
              {/* Vinyl ring graphic */}
              <div className="relative flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(60,18,8,1) 0%, rgba(90,30,14,1) 25%, rgba(50,14,6,1) 50%, rgba(80,24,10,1) 75%, rgba(60,18,8,1) 100%)",
                    boxShadow: "0 0 0 1px rgba(122,46,30,0.3), inset 0 0 0 20px rgba(37,8,12,1)",
                  }}
                />
                <div className="absolute w-3 h-3 rounded-full bg-espresso border border-rust/20" />
              </div>
              <p className="font-body text-cream/25 text-[9px] tracking-[0.3em] uppercase text-center">
                Playlist / TBD
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
