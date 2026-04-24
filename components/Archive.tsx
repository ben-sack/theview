"use client";
import { useInView } from "@/hooks/useInView";

// Warm atmospheric tones — each suggests a different kind of dim evening moment
const FRAMES = [
  { bg: "#2E100A", accent: "rgba(140,60,20,0.12)" },
  { bg: "#1E0C08", accent: "rgba(100,40,14,0.08)" },
  { bg: "#391508", accent: "rgba(160,70,28,0.15)" },
  { bg: "#160A06", accent: "rgba(80,28,10,0.10)" },
  { bg: "#311208", accent: "rgba(130,52,18,0.13)" },
  { bg: "#1C0C08", accent: "rgba(110,44,16,0.09)" },
];

const DELAYS = ["", "reveal-d1", "reveal-d2", "reveal-d3", "reveal-d2", "reveal-d1"];

export function Archive() {
  const { ref, inView } = useInView<HTMLElement>(0.08);
  const v = inView ? "in-view" : "";

  return (
    <section
      ref={ref}
      className="py-36 md:py-48 px-6 md:px-16 lg:px-24 border-t border-rust/10"
    >
      <p className={`font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-14 reveal ${v}`}>
        Past Evenings
      </p>

      {/* Asymmetric grid — 2 cols mobile, 3 cols desktop, mixed row heights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 max-w-4xl">
        {FRAMES.map((f, i) => (
          <div
            key={i}
            className={`reveal ${DELAYS[i]} ${v} ${i === 0 ? "row-span-2" : ""}`}
            style={{
              aspectRatio: i === 0 ? undefined : i % 3 === 2 ? "4/3" : "3/4",
              height: i === 0 ? "100%" : undefined,
              minHeight: i === 0 ? "24rem" : undefined,
              background: `radial-gradient(ellipse at ${i % 2 === 0 ? "30% 60%" : "70% 40%"}, ${f.accent} 0%, transparent 70%), ${f.bg}`,
            }}
          />
        ))}
      </div>

      <p className={`font-display italic text-cream/25 text-sm mt-10 reveal reveal-d4 ${v}`}>
        Unannounced. Undocumented. Yours.
      </p>
    </section>
  );
}
