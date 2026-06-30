"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function MembersLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/members/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/members/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push("/members/portal");
  }

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

        <div className="space-y-2">
          <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50">Members</p>
          <h1 className="font-display text-3xl text-ivory font-light">Welcome back.</h1>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendCode} className="w-full space-y-4">
            <div className="space-y-2">
              <p className="font-body text-xs text-cream/40">Enter the phone number on your account.</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(323) 000-0000"
                autoFocus
                required
                className="w-full bg-white/5 border border-tan/20 rounded px-4 py-3 font-body text-sm text-ivory placeholder-tan/30 focus:outline-none focus:border-tan/50 text-center tracking-widest"
              />
            </div>
            {error && (
              <div className="space-y-2">
                <p className="font-body text-xs text-rust">{error}</p>
                {error.includes("request access") && (
                  <a
                    href="/#access"
                    className="block font-body text-xs text-tan/50 hover:text-cream/70 underline underline-offset-2 transition-colors"
                  >
                    Request access →
                  </a>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-ivory text-espresso font-body text-sm font-medium tracking-widest uppercase py-4 rounded hover:bg-cream transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="w-full space-y-4">
            <div className="space-y-2">
              <p className="font-body text-xs text-cream/40">Enter the 6-digit code we just texted you.</p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                required
                className="w-full bg-white/5 border border-tan/20 rounded px-4 py-3 font-body text-lg text-ivory placeholder-tan/30 focus:outline-none focus:border-tan/50 text-center tracking-[0.5em]"
              />
            </div>
            {error && <p className="font-body text-xs text-rust">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-ivory text-espresso font-body text-sm font-medium tracking-widest uppercase py-4 rounded hover:bg-cream transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Enter"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              className="font-body text-xs text-tan/40 hover:text-tan/70 transition-colors"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
