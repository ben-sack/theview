"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { WordmarkSVG } from "./WordmarkSVG";

export function Hero() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);  // logo + tagline
    const t2 = setTimeout(() => setPhase(2), 600);  // wordmark
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <section
      className="relative flex flex-col overflow-hidden bg-oxblood md:snap-start"
      style={{ minHeight: "100svh" }}
    >
      {/* Atmospheric warm glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

      {/* ── Centered composition: logo → tagline → wordmark ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-6 py-24">

        {/* Eye logo mark */}
        <div
          className={`transition-all duration-1000 ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Image
            src="/logo.png"
            alt=""
            aria-hidden="true"
            width={120}
            height={90}
            className="w-20 md:w-28 h-auto select-none"
            priority
          />
        </div>

        {/* Tagline */}
        <div
          className={`text-center transition-all duration-1000 delay-100 ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 mb-2">
            Los Angeles
          </p>
          <p className="font-display italic text-cream/45 text-base md:text-lg leading-snug font-light">
            A gathering. By invitation.
          </p>
        </div>

        {/* SVG wordmark — draws itself in */}
        <div
          className={`w-full max-w-[280px] md:max-w-sm lg:max-w-md transition-opacity duration-700 ${
            phase >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <WordmarkSVG animate={phase >= 2} className="w-full h-auto" />
        </div>

      </div>
    </section>
  );
}
