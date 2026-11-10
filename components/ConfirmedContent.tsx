"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

export function ConfirmedContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [smsHref, setSmsHref] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch("/api/invite-template")
      .then((r) => r.json())
      .then((d) => {
        const siteUrl = window.location.origin;
        const referralLink = `${siteUrl}/?ref=${id}`;
        const message = (d.template || "").replace(/\{link\}/g, referralLink);
        setSmsHref(`sms:?&body=${encodeURIComponent(message)}`);
      });
  }, [id]);

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-svh bg-oxblood overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

      <div className="relative z-10 flex flex-col items-center gap-10 text-center px-6">
        <Image
          src="/logo.png"
          alt=""
          aria-hidden="true"
          width={120}
          height={90}
          className="w-16 md:w-20 h-auto select-none opacity-70"
          priority
        />

        <div className="space-y-4 max-w-sm">
          <h1 className="font-display text-3xl md:text-4xl text-ivory font-light leading-snug">
            Your request has been received.
          </h1>
          <p className="font-display italic text-cream/40 text-lg font-light leading-relaxed">
            We'll be in touch when the time is right.
          </p>
        </div>

        {smsHref && (
          <a
            href={smsHref}
            className="inline-flex items-center justify-center gap-2.5 bg-tan text-espresso font-body text-sm font-medium tracking-[0.2em] uppercase py-4 px-8 rounded hover:bg-smoke transition-colors duration-200 shadow-[0_12px_32px_-14px_rgba(158,128,96,0.6)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 3.5 11.5 8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" /></svg>
            Invite a Friend
          </a>
        )}

        <a
          href="https://www.instagram.com/theview.la/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-[9px] tracking-[0.36em] uppercase text-tan/40 hover:text-tan/70 transition-colors mt-4"
        >
          Follow on Instagram
        </a>
      </div>
    </div>
  );
}
