"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type NextEvent = {
  title: string;
  date: string;
  end_time: string | null;
  city: string | null;
  partners: string | null;
  announcement_blurb: string | null;
};

function formatTimeCompact(date: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  }).formatToParts(new Date(date));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toUpperCase();
  return minute === "00" ? `${hour}${dayPeriod}` : `${hour}:${minute}${dayPeriod}`;
}

export function NextEventContent() {
  const [event, setEvent] = useState<NextEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/next-event")
      .then((r) => r.json())
      .then((d) => {
        setEvent(d.event ?? null);
        setLoading(false);
      });
  }, []);

  const eventDate = event
    ? new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })
    : "";

  const eventTime = event
    ? event.end_time
      ? `${formatTimeCompact(event.date)} – ${formatTimeCompact(event.end_time)}`
      : formatTimeCompact(event.date)
    : "";

  return (
    <div className="relative flex flex-col items-center justify-center min-h-svh bg-oxblood overflow-hidden px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-sm w-full">
        <Image src="/logo.png" alt="" aria-hidden width={120} height={90} className="w-14 h-auto opacity-70" priority />

        {loading && <div className="w-2 h-2 rounded-full bg-rust/40 animate-pulse" />}

        {!loading && event && (
          <div className="space-y-3">
            <h1 className="font-display text-3xl md:text-4xl text-ivory font-light">
              {event.title}
            </h1>
            <p className="font-body text-sm text-cream/50">{eventDate}</p>
            <p className="font-body text-sm text-cream/50">{eventTime}</p>
            {event.city && (
              <p className="font-body text-sm text-cream/40">{event.city}</p>
            )}
            {event.announcement_blurb && (
              <p className="font-display italic text-cream/60 text-lg font-light pt-2">
                {event.announcement_blurb}
              </p>
            )}
          </div>
        )}

        {!loading && !event && (
          <div className="space-y-3">
            <p className="font-display italic text-cream/50 text-2xl font-light">
              Nothing announced yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
