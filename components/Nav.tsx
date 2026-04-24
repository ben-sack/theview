"use client";
import { useEffect, useState } from "react";

export function Nav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-6 transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Left: wordmark */}
      <span className="font-body text-[10px] tracking-[0.32em] uppercase text-cream/50 select-none">
        The View
      </span>

      {/* Right: CTAs */}
      <nav className="flex items-center gap-5">
        <a
          href="#access"
          className="font-body text-[10px] tracking-[0.28em] uppercase text-cream/50 hover:text-cream/90 transition-colors"
        >
          Request Access
        </a>
        <span className="text-rust/30 text-xs">/</span>
        <a
          href="https://instagram.com/theview.losangeles"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="text-cream/40 hover:text-cream/80 transition-colors"
        >
          {/* Instagram icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
          </svg>
        </a>
      </nav>
    </header>
  );
}
