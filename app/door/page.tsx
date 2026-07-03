"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DoorLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/door/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/door/events");
    } else {
      setError("Incorrect password.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-espresso flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl text-ivory font-light tracking-wide">The View</h1>
          <p className="font-body text-sm text-tan tracking-widest uppercase">Door Access</p>
        </div>
        <form onSubmit={login} className="space-y-4">
          <input
            type="text"
            value="theview-door"
            autoComplete="username"
            readOnly
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-espresso border border-tan/30 rounded px-4 py-4 font-body text-base text-ivory placeholder-tan/40 focus:outline-none focus:border-rust text-center tracking-widest"
            autoComplete="current-password"
            autoFocus
          />
          {error && <p className="font-body text-sm text-rust text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-4 bg-ivory text-espresso font-body text-sm font-medium rounded hover:bg-tan/20 hover:text-ivory transition-colors duration-200 disabled:opacity-40 tracking-widest uppercase"
          >
            {loading ? "…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
