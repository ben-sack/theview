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
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <a href="/" className="font-body text-xs tracking-widest uppercase text-tan hover:text-rust transition-colors mb-6 inline-block">
            The View
          </a>
          <h1 className="font-display text-4xl text-espresso font-light mb-10">
            Admin
          </h1>
          <form onSubmit={login} className="space-y-6">
            <div className="space-y-2">
              <label className="font-body text-xs tracking-widest uppercase text-tan font-medium">
                Password
              </label>
              <input
                className="w-full border border-tan/40 bg-white rounded px-4 py-3 text-sm text-espresso placeholder-tan/50 focus:outline-none focus:border-rust"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
            </div>
            {loginError && (
              <p className="text-sm text-rust font-body">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-espresso text-ivory font-body text-sm tracking-widest uppercase py-3 rounded hover:bg-rust transition-colors duration-200"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      {/* Header */}
      <header className="bg-espresso px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="font-display text-xl text-ivory font-light tracking-wide hover:text-cream transition-colors">
            The View
          </a>
          <span className="text-tan text-sm">/</span>
          <span className="font-body text-xs tracking-widest uppercase text-tan">
            Admin
          </span>
        </div>
        <button
          onClick={logout}
          className="font-body text-xs tracking-widest uppercase text-tan hover:text-ivory transition-colors border border-tan/30 hover:border-tan px-4 py-2 rounded"
        >
          Sign out
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-tan/20 px-8">
        <div className="flex gap-1">
          {(["pending", "approved", "message", "blast"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-body text-sm tracking-wide px-4 py-4 border-b-2 transition-colors duration-200 ${
                tab === t
                  ? "border-rust text-rust font-medium"
                  : "border-transparent text-tan hover:text-espresso"
              }`}
            >
              {t === "pending" ? "Pending" : t === "approved" ? "Members" : t === "message" ? "Welcome Message" : "Text Blasts"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="px-8 py-8">
        {loading ? (
          <p className="font-body text-sm text-tan animate-pulse">Loading…</p>
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
      <p className="font-body text-base text-tan italic">No pending requests.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contacts.map((c) => (
        <div
          key={c.id}
          className="bg-white border border-tan/25 rounded-lg p-5 flex flex-col gap-4 shadow-sm"
        >
          <div>
            <p className="font-display text-2xl text-espresso font-light">{c.name}</p>
            {c.occupation && (
              <p className="font-body text-sm text-tan mt-0.5">{c.occupation}</p>
            )}
          </div>

          <div className="space-y-2 font-body text-sm border-t border-tan/15 pt-3">
            {c.email && (
              <div className="flex gap-3 items-baseline">
                <span className="text-xs uppercase tracking-widest text-tan w-8 shrink-0">Email</span>
                <span className="text-espresso">{c.email}</span>
              </div>
            )}
            {c.phone && (
              <div className="flex gap-3 items-baseline">
                <span className="text-xs uppercase tracking-widest text-tan w-8 shrink-0">Phone</span>
                <span className="text-espresso">{c.phone}</span>
              </div>
            )}
            {c.ig_handle && (
              <div className="flex gap-3 items-baseline">
                <span className="text-xs uppercase tracking-widest text-tan w-8 shrink-0">IG</span>
                <a
                  href={`https://instagram.com/${c.ig_handle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber hover:text-rust transition-colors"
                >
                  {c.ig_handle.startsWith("@") ? c.ig_handle : `@${c.ig_handle}`}
                </a>
              </div>
            )}
            {c.referred_by && (
              <div className="flex gap-3 items-baseline">
                <span className="text-xs uppercase tracking-widest text-tan w-8 shrink-0">Ref</span>
                <span className="text-espresso">{c.referred_by}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-auto pt-1">
            <button
              onClick={() => onUpdate(c.id, "approved")}
              className="flex-1 font-body text-sm font-medium py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200"
            >
              Approve
            </button>
            <button
              onClick={() => onUpdate(c.id, "rejected")}
              className="flex-1 font-body text-sm font-medium py-2.5 bg-white text-rust border border-rust/40 rounded hover:bg-rust/5 transition-colors duration-200"
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
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-2xl text-espresso font-light mb-1">Welcome Message</h2>
        <p className="font-body text-sm text-tan leading-relaxed">
          Sent automatically when you approve someone. Use{" "}
          <span className="text-rust font-mono bg-rust/10 px-1 rounded">{"{name}"}</span>{" "}
          to personalize it with their first name.
        </p>
      </div>

      <div className="space-y-1">
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={8}
          placeholder={`Hi {name}, you've been approved for The View. Here's what to expect…`}
          className="w-full bg-white border border-tan/30 rounded-lg px-4 py-3 font-body text-sm text-black placeholder-tan/60 focus:outline-none focus:border-rust resize-none leading-relaxed"
        />
        <p className="font-body text-xs text-tan">{template.length} characters</p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="font-body text-sm font-medium px-6 py-3 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Message"}
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
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-2xl text-espresso font-light mb-1">Text Blasts</h2>
        <p className="font-body text-sm text-tan leading-relaxed">
          Send a message to all approved members at once — event announcements, reminders, or any update you want to share.
        </p>
      </div>

      {memberCount !== null && (
        <div className="bg-white border border-tan/25 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-2xl font-display text-espresso font-light">{memberCount}</span>
          <span className="font-body text-sm text-tan">{memberCount === 1 ? "member" : "members"} will receive this message</span>
        </div>
      )}

      <div className="space-y-1">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          placeholder="Hey, just wanted to let you know our next event is this Saturday…"
          className="w-full bg-white border border-tan/30 rounded-lg px-4 py-3 font-body text-sm text-black placeholder-tan/60 focus:outline-none focus:border-rust resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between font-body text-xs text-tan">
          <span>{message.length} characters · {segments} {segments === 1 ? "segment" : "segments"}</span>
          {estimatedCost !== null && (
            <span>Est. cost: <strong className="text-espresso">${estimatedCost}</strong></span>
          )}
        </div>
      </div>

      {result && (
        <div className={`rounded-lg px-4 py-3 font-body text-sm ${result.failures.length === 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
          <p>Sent to {result.sent} {result.sent === 1 ? "member" : "members"}.</p>
          {result.failures.length > 0 && (
            <p className="mt-1">Failed: {result.failures.join(", ")}</p>
          )}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !message.trim()}
        className="font-body text-sm font-medium px-6 py-3 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-tan">
          {contacts.length} {contacts.length === 1 ? "member" : "members"}
        </p>
        {contacts.length > 0 && (
          <button
            onClick={onExport}
            className="font-body text-sm font-medium text-espresso border border-tan/40 hover:border-rust hover:text-rust px-4 py-2 rounded transition-all duration-200"
          >
            Export CSV
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="font-body text-base text-tan italic">No members yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-tan/20 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-tan/20 bg-ivory">
                {["Name", "Email", "Phone", "Instagram", "Joined"].map((h) => (
                  <th
                    key={h}
                    className="font-body text-xs tracking-widest uppercase text-tan pb-3 pt-3 px-4 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-tan/10 hover:bg-ivory/60 transition-colors">
                  <td className="font-body text-sm font-medium text-espresso py-3 px-4">{c.name}</td>
                  <td className="font-body text-sm text-tan py-3 px-4">{c.email}</td>
                  <td className="font-body text-sm text-tan py-3 px-4">{c.phone ?? "—"}</td>
                  <td className="font-body text-sm py-3 px-4">
                    {c.ig_handle ? (
                      <a
                        href={`https://instagram.com/${c.ig_handle.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber hover:text-rust transition-colors"
                      >
                        {c.ig_handle.startsWith("@") ? c.ig_handle : `@${c.ig_handle}`}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="font-body text-sm text-tan py-3 px-4">
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
