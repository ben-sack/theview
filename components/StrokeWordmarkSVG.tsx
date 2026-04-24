"use client";

const EASE = "cubic-bezier(0.4, 0, 0.15, 1)";
const STROKE_COLOR = "rgba(244,236,216,0.88)";

interface Seg {
  d: string;
  delay: number;
  dur: number;
}

// Stroke centerline paths derived from the filled polygon data in the-view-logo.svg.
// ViewBox 0 0 482 192. Baseline ≈ y152, cap ≈ y51, x-height ≈ y104, ascender ≈ y63.
// Each path uses pathLength="1" so stroke-dashoffset animates 1→0.
const SEGS: Seg[] = [
  // ── T ──
  // Crossbar: left edge x=50, right edge x=140, y≈51
  { d: "M 140,51 L 50,51", delay: 0, dur: 0.7 },
  // Stem: branches at (95,51), leans left as it descends — editorial italic feel
  { d: "M 95,51 C 91,82 80,118 62,150", delay: 0.35, dur: 0.75 },

  // ── h ──
  // Left ascender: (112,63) → (98,152)
  { d: "M 112,63 L 98,152", delay: 0.6, dur: 0.72 },
  // Arch + right leg (no backtrack): from mid-ascender, peaks at (160,108), right leg descends to (128,152)
  { d: "M 108,113 C 123,103 144,101 160,110 C 165,124 158,141 143,143 L 128,152", delay: 0.9, dur: 1.0 },

  // ── e (The) ──
  // Bar left→right, then curve up and around bowl; counter eye ≈ (180,120); exit arm right
  { d: "M 163,120 L 192,120 C 195,113 192,102 183,100 C 171,98 161,107 161,120 C 160,133 168,143 180,143 C 190,143 198,135 201,125", delay: 1.25, dur: 0.9 },

  // ── V ──
  // Left arm: (208,65)→valley (222,158) — 14px horizontal gives readable V-left-arm angle
  // Right arm sweeps diagonally to cap peak (365,26)
  { d: "M 208,65 L 222,158 C 250,132 278,106 304,78 C 325,55 347,37 365,26", delay: 1.65, dur: 1.35 },

  // ── i (View) ──
  // Italic stem, leans right: bottom (307,149) → top (323,91)
  { d: "M 307,149 L 323,91", delay: 2.1, dur: 0.5 },
  // ── e (View) ──
  // Bar left→right, then curve up and around bowl; counter eye ≈ (352,116); exit arm right
  { d: "M 338,120 L 366,120 C 369,113 366,102 357,100 C 345,98 335,107 335,120 C 334,133 342,143 354,143 C 364,143 372,135 375,125", delay: 2.7, dur: 0.9 },

  // ── w ──
  // Entry from e at (378,124); two valleys; right tip rises to (459,97)
  { d: "M 378,124 C 377,140 380,150 385,148 C 396,144 407,131 411,135 C 417,144 421,151 425,146 C 436,130 448,112 459,97", delay: 3.2, dur: 0.95 },
];

interface Props {
  animate: boolean;
  className?: string;
}

export function StrokeWordmarkSVG({ animate, className }: Props) {
  return (
    <svg
      viewBox="0 0 482 192"
      className={className}
      role="img"
      aria-label="The View"
      overflow="visible"
      fill="none"
    >
      <title>The View</title>
      {SEGS.map((seg, i) => (
        <path
          key={i}
          d={seg.d}
          stroke={STROKE_COLOR}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          style={{
            strokeDasharray: "1",
            strokeDashoffset: animate ? 0 : 1,
            transition: animate
              ? `stroke-dashoffset ${seg.dur}s ${EASE} ${seg.delay}s`
              : "none",
          }}
        />
      ))}
    </svg>
  );
}
