"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ComingSoon() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-svh bg-oxblood overflow-hidden"
    >
      {/* Atmospheric warm glow — mirrors Hero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <Image
          src="/logo.png"
          alt=""
          aria-hidden="true"
          width={120}
          height={90}
          className="w-16 md:w-20 h-auto select-none opacity-70"
          priority
        />

        <div className="text-center flex flex-col gap-2">
          <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50">
            Los Angeles
          </p>
          <p className="font-display italic text-cream/35 text-lg md:text-xl font-light">
            Coming Soon
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-5 w-56"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="password"
            autoComplete="off"
            autoFocus
            className="field w-full text-center text-[11px] tracking-[0.28em] placeholder:tracking-[0.2em] placeholder:text-tan/30"
          />

          <div className="h-3 flex items-center">
            {error && (
              <p className="font-body text-[9px] tracking-[0.3em] uppercase text-rust/60">
                incorrect
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="font-body text-[9px] tracking-[0.4em] uppercase text-tan/40 hover:text-cream/60 transition-colors duration-500 disabled:pointer-events-none disabled:opacity-20"
          >
            {loading ? "—" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
