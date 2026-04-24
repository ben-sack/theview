"use client";

// Path data from the-view-logo.svg.
// Original fill was #000000 — changed to cream to sit on the oxblood background.
// Animation: blur(14px)+scaleX(1.12) resolves to blur(0)+scaleX(1), approximating
// the letter-spacing-collapse effect on a filled polygon path.
const PATH = `
  M 300 139 L 304 144 L 307 144 L 333 125 L 334 140 L 338 144 L 342 145 L 356 140
  L 375 125 L 376 127 L 371 140 L 371 146 L 374 151 L 379 151 L 401 127 L 402 138
  L 407 143 L 415 143 L 428 133 L 459 97 L 459 94 L 455 92 L 432 121 L 417 135
  L 409 139 L 409 131 L 422 109 L 422 106 L 420 104 L 415 104 L 389 138 L 378 146
  L 377 144 L 381 132 L 396 106 L 392 100 L 390 100 L 387 103 L 378 119 L 359 132
  L 347 138 L 341 138 L 340 132 L 346 131 L 351 128 L 361 117 L 362 108 L 358 103
  L 349 104 L 344 108 L 336 120 L 311 136 L 311 130 L 326 98 L 326 95 L 322 91
  L 319 91 L 303 124 L 300 133 Z
  M 354 113 L 355 114 L 349 119 L 348 118 Z
  M 337 72 L 332 70 L 330 71 L 326 77 L 326 80 L 329 83 L 332 83 L 339 74 Z
  M 196 112 L 166 133 L 155 138 L 150 138 L 148 133 L 150 131 L 155 131 L 160 128
  L 168 120 L 171 114 L 171 108 L 166 103 L 160 103 L 156 105 L 147 116 L 124 134
  L 123 132 L 131 114 L 131 110 L 128 106 L 122 106 L 108 119 L 107 118 L 108 112
  L 124 72 L 125 67 L 119 61 L 107 90 L 95 126 L 88 151 L 88 156 L 91 159 L 95 158
  L 102 136 L 111 123 L 122 112 L 122 117 L 114 133 L 115 142 L 119 144 L 141 126
  L 142 138 L 144 142 L 151 145 L 159 143 L 172 135 L 183 126 Z
  M 162 113 L 163 115 L 158 119 L 157 118 Z
  M 136 53 L 129 50 L 89 51 L 85 48 L 80 53 L 64 57 L 49 66 L 47 70 L 47 77
  L 58 99 L 60 106 L 58 117 L 47 141 L 46 147 L 49 151 L 53 151 L 64 132 L 68 113
  L 81 81 L 87 61 L 92 58 L 100 57 L 137 58 Z
  M 77 61 L 77 67 L 64 98 L 57 86 L 54 74 L 62 66 Z
  M 365 23 L 360 21 L 355 23 L 333 37 L 315 51 L 293 71 L 230 136 L 228 134
  L 229 102 L 227 80 L 224 71 L 220 65 L 216 62 L 208 61 L 206 65 L 215 74
  L 219 88 L 219 158 L 225 161 L 233 149 L 264 113 L 299 77 L 327 52 L 352 34
  L 355 35 L 356 41 L 360 43 L 366 30 Z
`.trim();

const EASE = "cubic-bezier(0.4, 0, 0.15, 1)";

interface Props {
  animate: boolean;
  className?: string;
}

export function WordmarkSVG({ animate, className }: Props) {
  return (
    <svg
      viewBox="0 0 482 192"
      className={className}
      role="img"
      aria-label="The View"
      overflow="visible"
      style={{
        opacity: animate ? 1 : 0,
        filter: animate ? "blur(0px)" : "blur(14px)",
        transform: animate ? "scaleX(1)" : "scaleX(1.14)",
        transformOrigin: "center center",
        transition: animate
          ? `opacity 2s ${EASE} 0.6s, filter 2.2s ${EASE} 0.6s, transform 2s ${EASE} 0.6s`
          : "none",
      }}
    >
      <title>The View</title>
      <path
        d={PATH}
        fill="rgba(244,236,216,0.88)"
        fillRule="evenodd"
      />
    </svg>
  );
}
