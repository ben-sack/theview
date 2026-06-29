"use client";
import { useState, useEffect, useCallback } from "react";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ig_handle: string | null;
  occupation: string | null;
  how_heard: string | null;
  referred_by: string | null;
  status: string;
  created_at: string;
};

type Tab = "pending" | "approved" | "message" | "blast";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async (status: Tab) => {
    setLoading(true);
    const res = await fetch(`/api/admin/contacts?status=${status}`);
    if (res.status === 401) { setAuthed(false); setLoading(false); return; }
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/admin/contacts?status=pending")
      .then((r) => {
        if (r.status === 401) { setAuthed(false); return null; }
        setAuthed(true);
        return r.json();
      })
      .then((data) => { if (data) setContacts(data.contacts ?? []); });
  }, []);

  useEffect(() => {
    if (authed) fetchContacts(tab);
  }, [tab, authed, fetchContacts]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { setLoginError("Incorrect password."); return; }
    setAuthed(true);
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
    setPassword("");
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    await fetch(`/api/admin/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Phone", "Instagram", "Occupation", "Joined"];
    const rows = contacts.map((c) => [
      c.name,
      c.email,
      c.phone ?? "",
      c.ig_handle ?? "",
      c.occupation ?? "",
      new Date(c.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "theview-members.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authed === null) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-rust/40 animate-pulse" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <a href="/" className="font-body text-[9px] tracking-[0.4em] uppercase text-tan/50 hover:text-tan/80 transition-colors mb-6 inline-block">
            The View
          </a>
          <h1 className="font-display text-3xl text-ivory font-light mb-10">
            Admin
          </h1>
          <form onSubmit={login} className="space-y-8">
            <div className="space-y-1">
              <label className="font-body text-[9px] tracking-[0.3em] uppercase text-cream/35">
                Password
              </label>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
            </div>
            {loginError && (
              <p className="font-body text-[9px] tracking-[0.2em] text-rust/80">{loginError}</p>
            )}
            <button
              type="submit"
              className="group inline-flex items-center gap-5 font-body text-[10px] tracking-[0.3em] uppercase text-cream/55 hover:text-cream/90 transition-colors duration-300 py-3"
            >
              <span>Enter</span>
              <span className="block h-px w-8 bg-rust/40 group-hover:w-14 group-hover:bg-amber/60 transition-all duration-400" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-espresso text-cream">
      {/* Header */}
      <header className="border-b border-rust/15 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="font-display text-lg text-ivory font-light tracking-wide hover:text-cream/70 transition-colors">
            The View
          </a>
          <span className="text-rust/30 text-xs">/</span>
          <span className="font-body text-[9px] tracking-[0.3em] uppercase text-tan/50">
            Admin
          </span>
        </div>
        <button
          onClick={logout}
          className="font-body text-[9px] tracking-[0.3em] uppercase text-tan/40 hover:text-tan/70 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Tabs */}
      <div className="border-b border-rust/10 px-8">
        <div className="flex gap-8">
          {(["pending", "approved", "message", "blast"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-body text-[9px] tracking-[0.3em] uppercase py-4 border-b transition-colors duration-200 ${
                tab === t
                  ? "border-amber/60 text-cream/90"
                  : "border-transparent text-tan/40 hover:text-tan/65"
              }`}
            >
              {t === "pending" ? "Pending" : t === "approved" ? "Members" : t === "message" ? "Welcome Message" : "Text Blasts"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="px-8 py-10">
        {loading ? (
          <p className="font-body text-[9px] tracking-[0.3em] uppercase text-tan/35 animate-pulse">
            Loading…
          </p>
        ) : tab === "pending" ? (
          <PendingTab contacts={contacts} onUpdate={updateStatus} />
        ) : tab === "approved" ? (
          <MembersTab contacts={contacts} onExport={exportCSV} />
        ) : tab === "message" ? (
          <MessageTab />
        ) : (
          <TextBlastTab />
        )}
      </main>
    </div>
  );
}

function PendingTab({
  contacts,
  onUpdate,
}: {
  contacts: Contact[];
  onUpdate: (id: string, status: "approved" | "rejected") => void;
}) {
  if (contacts.length === 0) {
    return (
      <p className="font-display italic text-cream/25 text-xl">
        No pending requests.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contacts.map((c) => (
        <div
          key={c.id}
          className="bg-crimson/40 border border-rust/15 rounded-sm p-6 flex flex-col gap-4"
        >
          <div className="space-y-2">
            <p className="font-display text-xl text-ivory font-light">{c.name}</p>
            {c.occupation && (
              <p className="font-body text-[11px] text-tan/60">{c.occupation}</p>
            )}
          </div>

          <div className="space-y-2 text-[11px] font-body">
            {c.ig_handle && (
              <div className="flex gap-2">
                <span className="text-tan/35 uppercase tracking-widest text-[9px]">IG</span>
                <a
                  href={`https://instagram.com/${c.ig_handle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber/70 hover:text-amber transition-colors"
                >
                  {c.ig_handle.startsWith("@") ? c.ig_handle : `@${c.ig_handle}`}
                </a>
              </div>
            )}
            {c.how_heard && (
              <div className="flex gap-2">
                <span className="text-tan/35 uppercase tracking-widest text-[9px]">Via</span>
                <span className="text-cream/50">{c.how_heard}</span>
              </div>
            )}
            {c.referred_by && (
              <div className="flex gap-2">
                <span className="text-tan/35 uppercase tracking-widest text-[9px]">Ref</span>
                <span className="text-cream/50">{c.referred_by}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2 mt-auto">
            <button
              onClick={() => onUpdate(c.id, "approved")}
              className="flex-1 font-body text-[9px] tracking-[0.25em] uppercase py-2.5 border border-amber/30 text-amber/70 hover:bg-amber/10 hover:text-amber hover:border-amber/50 transition-all duration-200 rounded-sm"
            >
              Approve
            </button>
            <button
              onClick={() => onUpdate(c.id, "rejected")}
              className="flex-1 font-body text-[9px] tracking-[0.25em] uppercase py-2.5 border border-rust/20 text-rust/50 hover:bg-rust/10 hover:text-rust/80 hover:border-rust/40 transition-all duration-200 rounded-sm"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageTab() {
  const [template, setTemplate] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sms-template")
      .then((r) => r.json())
      .then((d) => setTemplate(d.template ?? ""));
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/sms-template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-2">
        <p className="font-body text-[9px] tracking-[0.3em] uppercase text-tan/50">
          Approval SMS
        </p>
        <p className="font-body text-[12px] text-cream/40 leading-relaxed">
          This message is sent automatically when you approve someone. Use{" "}
          <span className="text-amber/60 font-mono">{"{name}"}</span> to
          personalize it with their first name.
        </p>
      </div>

      <div className="space-y-1">
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={7}
          placeholder={`Hi {name}, you've been approved for The View. Here's what to expect…`}
          className="w-full bg-crimson/30 border border-rust/20 rounded-sm px-4 py-3 font-body text-[13px] text-cream/80 placeholder-tan/25 focus:outline-none focus:border-amber/30 resize-none leading-relaxed"
        />
        <p className="font-body text-[9px] text-tan/30 tracking-widest">
          {template.length} characters
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="font-body text-[9px] tracking-[0.3em] uppercase py-3 px-6 border border-amber/30 text-amber/70 hover:bg-amber/10 hover:text-amber hover:border-amber/50 transition-all duration-200 rounded-sm disabled:opacity-40"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save Message"}
      </button>
    </div>
  );
}

const TWILIO_PRICE_PER_SEGMENT = 0.0079;

function getSegmentCount(text: string) {
  if (text.length === 0) return 0;
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
}

function TextBlastTab() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failures: string[] } | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/text-blast")
      .then((r) => r.json())
      .then((d) => setMemberCount(d.memberCount ?? 0));
  }, []);

  const segments = getSegmentCount(message);
  const estimatedCost = memberCount !== null && segments > 0
    ? (memberCount * segments * TWILIO_PRICE_PER_SEGMENT).toFixed(2)
    : null;

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    const res = await fetch("/api/admin/text-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setResult(data);
    setSending(false);
    if (data.sent > 0) setMessage("");
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-2">
        <p className="font-body text-[9px] tracking-[0.3em] uppercase text-tan/50">
          Text Blasts
        </p>
        <p className="font-body text-[12px] text-cream/40 leading-relaxed">
          Send a message to all approved members at once. Use this for event announcements, updates, or anything you want to share with the full list.
        </p>
      </div>

      <div className="space-y-1">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          placeholder="Hey, just wanted to let you know our next event is this Saturday…"
          className="w-full bg-crimson/30 border border-rust/20 rounded-sm px-4 py-3 font-body text-[13px] text-cream/80 placeholder-tan/25 focus:outline-none focus:border-amber/30 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <p className="font-body text-[9px] text-tan/30 tracking-widest">
            {message.length} characters · {segments} {segments === 1 ? "segment" : "segments"}
          </p>
          {estimatedCost !== null && (
            <p className="font-body text-[9px] text-tan/40 tracking-widest">
              {memberCount} {memberCount === 1 ? "member" : "members"} · est. ${estimatedCost}
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-1">
          <p className="font-body text-[11px] text-amber/70">
            Sent to {result.sent} {result.sent === 1 ? "member" : "members"}.
          </p>
          {result.failures.length > 0 && (
            <p className="font-body text-[11px] text-rust/60">
              Failed: {result.failures.join(", ")}
            </p>
          )}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !message.trim()}
        className="font-body text-[9px] tracking-[0.3em] uppercase py-3 px-6 border border-amber/30 text-amber/70 hover:bg-amber/10 hover:text-amber hover:border-amber/50 transition-all duration-200 rounded-sm disabled:opacity-40"
      >
        {sending ? "Sending…" : "Send to All Members"}
      </button>
    </div>
  );
}

function MembersTab({
  contacts,
  onExport,
}: {
  contacts: Contact[];
  onExport: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-body text-[9px] tracking-[0.3em] uppercase text-tan/40">
          {contacts.length} {contacts.length === 1 ? "member" : "members"}
        </p>
        {contacts.length > 0 && (
          <button
            onClick={onExport}
            className="font-body text-[9px] tracking-[0.3em] uppercase text-tan/40 hover:text-tan/70 border border-rust/20 hover:border-rust/40 px-4 py-2 transition-all duration-200 rounded-sm"
          >
            Export CSV
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="font-display italic text-cream/25 text-xl">No members yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rust/15">
                {["Name", "Email", "Phone", "Instagram", "Occupation", "Joined"].map((h) => (
                  <th
                    key={h}
                    className="font-body text-[8px] tracking-[0.3em] uppercase text-tan/35 pb-3 pr-6 font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-rust/8 hover:bg-crimson/20 transition-colors">
                  <td className="font-body text-[13px] text-ivory py-3.5 pr-6">{c.name}</td>
                  <td className="font-body text-[12px] text-cream/60 py-3.5 pr-6">{c.email}</td>
                  <td className="font-body text-[12px] text-cream/60 py-3.5 pr-6">{c.phone ?? "—"}</td>
                  <td className="font-body text-[12px] py-3.5 pr-6">
                    {c.ig_handle ? (
                      <a
                        href={`https://instagram.com/${c.ig_handle.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber/60 hover:text-amber transition-colors"
                      >
                        {c.ig_handle.startsWith("@") ? c.ig_handle : `@${c.ig_handle}`}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="font-body text-[12px] text-cream/60 py-3.5 pr-6">{c.occupation ?? "—"}</td>
                  <td className="font-body text-[12px] text-cream/40 py-3.5">
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
