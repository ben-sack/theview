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
  rejection_reason: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  sms_opted_out: boolean;
};

type Tab = "pending" | "approved" | "rejected" | "events" | "message" | "blast" | "referrals" | "settings";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchContacts = useCallback(async (status: Tab) => {
    if (status === "message" || status === "blast" || status === "referrals" || status === "rejected" || status === "events") return;
    setLoading(true);
    const res = await fetch(`/api/admin/contacts?status=${status}`);
    if (res.status === 401) { setAuthed(false); setLoading(false); return; }
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setLoading(false);
  }, []);

  const fetchPendingCount = useCallback(async () => {
    const res = await fetch("/api/admin/contacts?status=pending");
    if (!res.ok) return;
    const data = await res.json();
    setPendingCount((data.contacts ?? []).length);
  }, []);

  useEffect(() => {
    fetch("/api/admin/contacts?status=pending")
      .then((r) => {
        if (r.status === 401) { setAuthed(false); return null; }
        setAuthed(true);
        return r.json();
      })
      .then((data) => {
        if (data) {
          setContacts(data.contacts ?? []);
          setPendingCount((data.contacts ?? []).length);
        }
      });
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

  async function updateStatus(id: string, status: "approved" | "rejected", reason?: string) {
    await fetch(`/api/admin/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejection_reason: reason }),
    });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (tab === "pending") setPendingCount((n) => Math.max(0, n - 1));
    else fetchPendingCount();
  }

  async function approveAll(contactsToApprove: Contact[]) {
    if (!confirm(`Approve all ${contactsToApprove.length} pending requests? This will send a welcome text to each person.`)) return;
    for (const c of contactsToApprove) {
      await fetch(`/api/admin/contacts/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
    }
    const approvedIds = new Set(contactsToApprove.map((c) => c.id));
    setContacts((prev) => prev.filter((c) => !approvedIds.has(c.id)));
    setPendingCount((n) => Math.max(0, n - contactsToApprove.length));
  }

  function exportCSV() {
    const headers = ["Name", "Email", "Phone", "Instagram", "Referred By", "Joined"];
    const rows = contacts.map((c) => [
      c.name,
      c.email,
      c.phone ?? "",
      c.ig_handle ?? "",
      c.referred_by ?? "",
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
          <h1 className="font-display text-4xl text-espresso font-light mb-10">Admin</h1>
          <form onSubmit={login} className="space-y-6">
            <input
              type="text"
              value="theview-admin"
              autoComplete="username"
              readOnly
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
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
                autoComplete="current-password"
                autoFocus
              />
            </div>
            {loginError && <p className="text-sm text-rust font-body">{loginError}</p>}
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

  const TAB_LABELS: Record<Tab, string> = {
    pending: "Pending",
    approved: "Members",
    rejected: "Rejected",
    events: "Events",
    message: "Automated Messages",
    blast: "Text Blasts",
    referrals: "Referrals",
    settings: "Settings",
  };

  return (
    <div className="min-h-screen bg-ivory text-espresso">
      <header className="bg-espresso px-4 sm:px-8 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <a href="/" className="font-display text-lg sm:text-xl text-ivory font-light tracking-wide hover:text-cream transition-colors shrink-0">
            The View
          </a>
          <span className="text-tan text-sm shrink-0">/</span>
          <span className="font-body text-xs tracking-widest uppercase text-tan truncate">Admin</span>
        </div>
        <button
          onClick={logout}
          className="font-body text-xs tracking-widest uppercase text-tan hover:text-ivory transition-colors border border-tan/30 hover:border-tan px-3 sm:px-4 py-2 rounded shrink-0"
        >
          Sign out
        </button>
      </header>

      <div className="bg-white border-b border-tan/20 px-4 sm:px-8 overflow-x-auto">
        <div className="flex gap-1 w-max">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative shrink-0 whitespace-nowrap font-body text-xs sm:text-sm tracking-wide px-3 py-3 sm:px-4 sm:py-4 border-b-2 transition-colors duration-200 ${
                tab === t ? "border-rust text-rust font-medium" : "border-transparent text-tan hover:text-espresso"
              }`}
            >
              {TAB_LABELS[t]}
              {t === "pending" && pendingCount > 0 && (
                <span className="ml-2 bg-rust text-ivory text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 sm:px-8 py-6 sm:py-8">
        {loading ? (
          <p className="font-body text-sm text-tan animate-pulse">Loading…</p>
        ) : tab === "pending" ? (
          <PendingTab contacts={contacts} onUpdate={updateStatus} onApproveAll={approveAll} />
        ) : tab === "approved" ? (
          <MembersTab contacts={contacts} onExport={exportCSV} onDelete={(id) => setContacts((prev) => prev.filter((c) => c.id !== id))} />
        ) : tab === "message" ? (
          <MessageTab />
        ) : tab === "rejected" ? (
          <RejectedTab />
        ) : tab === "events" ? (
          <EventsTab />
        ) : tab === "blast" ? (
          <TextBlastTab />
        ) : tab === "referrals" ? (
          <ReferralsTab />
        ) : (
          <SettingsTab />
        )}
      </main>
    </div>
  );
}

function PendingTab({
  contacts,
  onUpdate,
  onApproveAll,
}: {
  contacts: Contact[];
  onUpdate: (id: string, status: "approved" | "rejected", reason?: string) => void;
  onApproveAll: (contacts: Contact[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [showOptedOut, setShowOptedOut] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const optedOutCount = contacts.filter((c) => c.sms_opted_out).length;

  const filtered = contacts
    .filter((c) => c.sms_opted_out === showOptedOut)
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.ig_handle ?? "").toLowerCase().includes(q) ||
        (c.referred_by ?? "").toLowerCase().includes(q)
      );
    });

  function startReject(id: string) {
    setRejectingId(id);
    setReason("");
  }

  function confirmReject(id: string) {
    onUpdate(id, "rejected", reason);
    setRejectingId(null);
    setReason("");
  }

  if (contacts.length === 0) {
    return <p className="font-body text-base text-tan italic">No pending requests.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, Instagram…"
          className="flex-1 sm:max-w-sm border border-tan/30 bg-white rounded px-4 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOptedOut((v) => !v)}
            className={`font-body text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded border transition-colors whitespace-nowrap ${
              showOptedOut
                ? "bg-rust text-ivory border-rust"
                : "text-espresso border-tan/40 hover:border-rust hover:text-rust"
            }`}
          >
            {showOptedOut ? `Showing not opted in (${optedOutCount})` : `Show not opted in (${optedOutCount})`}
          </button>
          {!showOptedOut && filtered.length > 1 && (
            <button
              onClick={() => onApproveAll(filtered)}
              className="font-body text-sm font-medium px-5 py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 whitespace-nowrap"
            >
              Approve All ({filtered.length})
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="font-body text-base text-tan italic">
          {search
            ? `No results for "${search}".`
            : showOptedOut
            ? "No one has declined texts."
            : "No pending requests have opted in to texts."}
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-tan/20 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-tan/20 bg-ivory divide-x divide-tan/10">
                {["", "Name", "Instagram", "Referred By", "Phone", "Email", "Joined", ""].map((h, i) => (
                  <th key={i} className="font-body text-[10px] sm:text-xs tracking-widest uppercase text-tan pb-2 pt-2 px-3 sm:pb-3 sm:pt-3 sm:px-4 font-medium text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-tan/10 divide-x divide-tan/10 hover:bg-ivory/60 transition-colors">
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                    <button
                      onClick={() => onUpdate(c.id, "approved")}
                      className="font-body text-xs font-medium text-tan/50 hover:text-espresso transition-colors whitespace-nowrap"
                    >
                      Approve
                    </button>
                  </td>
                  <td className="font-body text-xs sm:text-sm font-medium text-espresso py-3 px-3 sm:py-3.5 sm:px-4 text-center">{capitalizeName(c.name)}</td>
                  <td className="font-body text-xs sm:text-sm py-3 px-3 sm:py-3.5 sm:px-4 text-center">
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
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.referred_by ?? "—"}</td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.phone ?? "—"}</td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.email}</td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center whitespace-nowrap">
                    {formatDateShort(c.created_at)}
                  </td>
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                    {rejectingId === c.id ? (
                      <div className="flex flex-col gap-1.5 items-center min-w-[140px]">
                        <input
                          autoFocus
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-full border border-tan/30 rounded px-2 py-1 text-xs text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmReject(c.id)}
                            className="font-body text-xs font-medium text-rust hover:text-rust/70 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="font-body text-xs text-tan/50 hover:text-espresso transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startReject(c.id)}
                        className="font-body text-xs text-tan/50 hover:text-rust transition-colors whitespace-nowrap"
                      >
                        Reject
                      </button>
                    )}
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

function capitalizeName(name: string) {
  return name.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

type SmsFilter = "all" | "in" | "out";

function SmsFilterControl({ value, onChange }: { value: SmsFilter; onChange: (v: SmsFilter) => void }) {
  const options: { key: SmsFilter; label: string }[] = [
    { key: "all", label: "Everyone" },
    { key: "in", label: "Opted In" },
    { key: "out", label: "Not Opted In" },
  ];
  return (
    <div className="flex rounded border border-tan/30 overflow-hidden shrink-0">
      {options.map((o, i) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`font-body text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap transition-colors ${
            value === o.key ? "bg-rust text-ivory" : "bg-white text-espresso hover:bg-ivory"
          } ${i > 0 ? "border-l border-tan/30" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function matchesSmsFilter(c: Contact, filter: SmsFilter) {
  if (filter === "in") return !c.sms_opted_out;
  if (filter === "out") return c.sms_opted_out;
  return true;
}

function OptInCell({ optedOut }: { optedOut: boolean }) {
  return (
    <span className={`font-body text-xs sm:text-sm font-medium ${optedOut ? "text-rust" : "text-espresso"}`}>
      {optedOut ? "No" : "Yes"}
    </span>
  );
}

function MembersTab({
  contacts,
  onExport,
  onDelete,
}: {
  contacts: Contact[];
  onExport: () => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [smsFilter, setSmsFilter] = useState<SmsFilter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  type GenderGroup = "male" | "female" | "unsure";
  type GenderMember = { id: string; name: string; gender: GenderGroup };
  const [genderCounts, setGenderCounts] = useState<{ male: number; female: number; unsure: number } | null>(null);
  const [genderMembers, setGenderMembers] = useState<GenderMember[]>([]);
  const [genderModalGroup, setGenderModalGroup] = useState<GenderGroup | null>(null);
  const [movingGenderId, setMovingGenderId] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    contacts.forEach((c) => { initial[c.id] = c.notes ?? ""; });
    setNotes(initial);
  }, [contacts]);

  function loadGenderBreakdown() {
    fetch("/api/admin/members-gender")
      .then((r) => r.json())
      .then((d) => {
        setGenderCounts(d.counts);
        setGenderMembers(d.members ?? []);
      });
  }

  useEffect(() => {
    loadGenderBreakdown();
  }, []);

  async function moveGender(memberId: string, newGroup: GenderGroup) {
    setMovingGenderId(memberId);
    const res = await fetch(`/api/admin/contacts/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender_override: newGroup }),
    });
    if (res.ok) {
      setGenderMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, gender: newGroup } : m)));
      setGenderCounts((prev) => {
        if (!prev) return prev;
        const moved = genderMembers.find((m) => m.id === memberId);
        if (!moved) return prev;
        return { ...prev, [moved.gender]: prev[moved.gender] - 1, [newGroup]: prev[newGroup] + 1 };
      });
    } else {
      alert("Failed to update. Please try again.");
    }
    setMovingGenderId(null);
  }

  async function saveNote(id: string) {
    setSavingNote(id);
    await fetch(`/api/admin/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes[id] ?? "" }),
    });
    setSavingNote(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the member list? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete(id);
    } else {
      alert("Failed to delete. Please try again.");
    }
    setDeleting(null);
  }

  const filtered = contacts
    .filter((c) => matchesSmsFilter(c, smsFilter))
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.ig_handle ?? "").toLowerCase().includes(q) ||
        (c.referred_by ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-5">
      {genderCounts && (
        <div className="bg-white border border-tan/20 rounded-lg px-4 sm:px-6 py-3 flex items-center gap-6 sm:gap-10">
          <p className="font-body text-xs text-tan tracking-widest uppercase">Gender <span className="text-tan/50 normal-case tracking-normal">(estimated from names — click to review)</span></p>
          <div className="flex items-center gap-5 sm:gap-8">
            <button type="button" onClick={() => setGenderModalGroup("male")} className="font-body text-sm text-espresso hover:text-rust transition-colors">
              <strong className="font-medium">{genderCounts.male}</strong> Male
            </button>
            <button type="button" onClick={() => setGenderModalGroup("female")} className="font-body text-sm text-espresso hover:text-rust transition-colors">
              <strong className="font-medium">{genderCounts.female}</strong> Female
            </button>
            <button type="button" onClick={() => setGenderModalGroup("unsure")} className="font-body text-sm text-tan hover:text-rust transition-colors">
              <strong className="font-medium">{genderCounts.unsure}</strong> Unsure
            </button>
          </div>
        </div>
      )}

      {genderModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-tan/15 shrink-0">
              <p className="font-display text-xl text-espresso font-light capitalize">{genderModalGroup} ({genderMembers.filter((m) => m.gender === genderModalGroup).length})</p>
              <button onClick={() => setGenderModalGroup(null)} className="font-body text-xs text-tan hover:text-espresso transition-colors">Close</button>
            </div>
            <div className="overflow-y-auto divide-y divide-tan/10">
              {genderMembers.filter((m) => m.gender === genderModalGroup).length === 0 ? (
                <p className="font-body text-sm text-tan italic px-6 py-8 text-center">No one in this group.</p>
              ) : (
                genderMembers
                  .filter((m) => m.gender === genderModalGroup)
                  .map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 px-6 py-3">
                      <p className="font-body text-sm text-espresso truncate">{m.name}</p>
                      <div className="flex gap-2 shrink-0">
                        {(["male", "female", "unsure"] as const)
                          .filter((g) => g !== m.gender)
                          .map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => moveGender(m.id, g)}
                              disabled={movingGenderId === m.id}
                              className="font-body text-[11px] px-2.5 py-1 rounded border border-tan/30 text-tan hover:border-rust hover:text-rust transition-colors disabled:opacity-40 capitalize"
                            >
                              {movingGenderId === m.id ? "…" : `Move to ${g}`}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, Instagram…"
            className="flex-1 sm:max-w-sm border border-tan/30 bg-white rounded px-4 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
          />
          <SmsFilterControl value={smsFilter} onChange={setSmsFilter} />
        </div>
        <div className="flex items-center gap-4">
          <p className="font-body text-sm text-tan whitespace-nowrap">
            {filtered.length} of {contacts.length} {contacts.length === 1 ? "member" : "members"}
          </p>
          {contacts.length > 0 && (
            <button
              onClick={onExport}
              className="font-body text-xs sm:text-sm font-medium text-espresso border border-tan/40 hover:border-rust hover:text-rust px-3 py-1.5 sm:px-4 sm:py-2 rounded transition-all duration-200 whitespace-nowrap"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {contacts.length === 0 ? (
        <p className="font-body text-base text-tan italic">No members yet.</p>
      ) : filtered.length === 0 ? (
        <p className="font-body text-base text-tan italic">
          {search ? `No results for "${search}".` : "No members match this filter."}
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-tan/20 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-tan/20 bg-ivory divide-x divide-tan/10">
                {["Name", "Instagram", "Referred By", "Phone", "Email", "Opted In", "Notes", "Joined", ""].map((h, i) => (
                  <th key={i} className="font-body text-[10px] sm:text-xs tracking-widest uppercase text-tan pb-2 pt-2 px-3 sm:pb-3 sm:pt-3 sm:px-4 font-medium text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-tan/10 divide-x divide-tan/10 hover:bg-ivory/60 transition-colors">
                  <td className="font-body text-xs sm:text-sm font-medium text-espresso py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.name}</td>
                  <td className="font-body text-xs sm:text-sm py-3 px-3 sm:py-3.5 sm:px-4 text-center">
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
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.referred_by ?? "—"}</td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.phone ?? "—"}</td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.email}</td>
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                    <OptInCell optedOut={c.sms_opted_out} />
                  </td>
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 min-w-[180px]">
                    <input
                      type="text"
                      value={notes[c.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      onBlur={() => saveNote(c.id)}
                      placeholder="Add note…"
                      className={`w-full bg-transparent border-b font-body text-xs text-espresso placeholder-tan/30 focus:outline-none py-1 text-center transition-colors ${savingNote === c.id ? "border-tan/20" : "border-transparent hover:border-tan/20 focus:border-rust"}`}
                    />
                  </td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center whitespace-nowrap">
                    {formatDateShort(c.created_at)}
                  </td>
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={deleting === c.id}
                      className="font-body text-xs text-tan/50 hover:text-rust transition-colors disabled:opacity-40"
                    >
                      {deleting === c.id ? "…" : "Remove"}
                    </button>
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

function RejectedTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [smsFilter, setSmsFilter] = useState<SmsFilter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== id));
    else alert("Failed to delete. Please try again.");
    setDeleting(null);
  }

  async function handleApprove(id: string) {
    setApproving(id);
    await fetch(`/api/admin/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setApproving(null);
  }

  useEffect(() => {
    fetch("/api/admin/contacts?status=rejected")
      .then((r) => r.json())
      .then((d) => {
        setContacts(d.contacts ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = contacts
    .filter((c) => matchesSmsFilter(c, smsFilter))
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.ig_handle ?? "").toLowerCase().includes(q) ||
        (c.rejection_reason ?? "").toLowerCase().includes(q)
      );
    });

  if (loading) return <p className="font-body text-sm text-tan animate-pulse">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, reason…"
            className="flex-1 sm:max-w-sm border border-tan/30 bg-white rounded px-4 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
          />
          <SmsFilterControl value={smsFilter} onChange={setSmsFilter} />
        </div>
        <p className="font-body text-sm text-tan whitespace-nowrap">
          {filtered.length} of {contacts.length} {contacts.length === 1 ? "person" : "people"}
        </p>
      </div>

      {contacts.length === 0 ? (
        <p className="font-body text-base text-tan italic">No rejected requests.</p>
      ) : filtered.length === 0 ? (
        <p className="font-body text-base text-tan italic">
          {search ? `No results for "${search}".` : "No one matches this filter."}
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-tan/20 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-tan/20 bg-ivory divide-x divide-tan/10">
                {["Name", "Instagram", "Phone", "Email", "Opted In", "Reason", "Date", "", ""].map((h, i) => (
                  <th key={i} className="font-body text-[10px] sm:text-xs tracking-widest uppercase text-tan pb-2 pt-2 px-3 sm:pb-3 sm:pt-3 sm:px-4 font-medium text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-tan/10 divide-x divide-tan/10 hover:bg-ivory/60 transition-colors">
                  <td className="font-body text-xs sm:text-sm font-medium text-espresso py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.name}</td>
                  <td className="font-body text-xs sm:text-sm py-3 px-3 sm:py-3.5 sm:px-4 text-center">
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
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.phone ?? "—"}</td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{c.email}</td>
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                    <OptInCell optedOut={c.sms_opted_out} />
                  </td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center italic">
                    {c.rejection_reason ?? <span className="not-italic text-tan/40">—</span>}
                  </td>
                  <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center whitespace-nowrap">
                    {formatDateShort(c.created_at)}
                  </td>
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                    <button
                      onClick={() => handleApprove(c.id)}
                      disabled={approving === c.id}
                      className="font-body text-xs text-tan/50 hover:text-espresso transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      {approving === c.id ? "…" : "Approve"}
                    </button>
                  </td>
                  <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={deleting === c.id}
                      className="font-body text-xs text-tan/50 hover:text-rust transition-colors disabled:opacity-40"
                    >
                      {deleting === c.id ? "…" : "Remove"}
                    </button>
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

type AdminEvent = {
  id: string;
  title: string;
  date: string;
  end_time: string | null;
  capacity: number;
  location: string | null;
  partners: string | null;
  allow_guests: boolean;
  rsvp_count: number;
  checked_in_count: number;
  waitlist_count: number;
};

function formatDateShort(date: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    timeZone: "America/Los_Angeles",
  }).formatToParts(new Date(date));
  const mm = parts.find((p) => p.type === "month")?.value ?? "";
  const dd = parts.find((p) => p.type === "day")?.value ?? "";
  const yy = parts.find((p) => p.type === "year")?.value ?? "";
  return `${mm}/${dd}/${yy}`;
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
}

function formatTimeRange(start: string, end: string | null) {
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

function EventsTab() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", date: "", end_time: "", capacity: "", location: "", partners: "", allow_guests: false });
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [editForm, setEditForm] = useState({ title: "", date: "", end_time: "", capacity: "", location: "", partners: "", allow_guests: false });
  const [editSaving, setEditSaving] = useState(false);

  function loadEvents() {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((d) => { setEvents(d.events ?? []); setLoading(false); });
  }

  useEffect(() => { loadEvents(); }, []);

  function toUtcIso(localValue: string) {
    return localValue ? new Date(localValue).toISOString() : null;
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        date: toUtcIso(form.date),
        end_time: toUtcIso(form.end_time),
        capacity: parseInt(form.capacity),
      }),
    });
    setForm({ title: "", date: "", end_time: "", capacity: "", location: "", partners: "", allow_guests: false });
    setAdding(false);
    setSaving(false);
    loadEvents();
  }

  async function deleteEvent(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeleting(null);
  }

  function toLocalIso(date: string | Date) {
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEdit(ev: AdminEvent) {
    setEditForm({
      title: ev.title,
      date: toLocalIso(ev.date),
      end_time: ev.end_time ? toLocalIso(ev.end_time) : "",
      capacity: String(ev.capacity),
      location: ev.location ?? "",
      partners: ev.partners ?? "",
      allow_guests: ev.allow_guests,
    });
    setEditingEvent(ev);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setEditSaving(true);
    await fetch(`/api/admin/events/${editingEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        date: toUtcIso(editForm.date),
        end_time: toUtcIso(editForm.end_time),
        capacity: parseInt(editForm.capacity),
      }),
    });
    setEditSaving(false);
    setEditingEvent(null);
    loadEvents();
  }

  if (loading) return <p className="font-body text-sm text-tan animate-pulse">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl text-espresso font-light">Edit Event</p>
              <button onClick={() => setEditingEvent(null)} className="font-body text-xs text-tan hover:text-espresso transition-colors">Cancel</button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-body text-xs tracking-widest uppercase text-tan">Title *</label>
                  <input
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso focus:outline-none focus:border-rust"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs tracking-widest uppercase text-tan">Start Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={editForm.date}
                    onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso focus:outline-none focus:border-rust"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs tracking-widest uppercase text-tan">End Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm((p) => ({ ...p, end_time: e.target.value }))}
                    className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso focus:outline-none focus:border-rust"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs tracking-widest uppercase text-tan">Capacity *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={editForm.capacity}
                    onChange={(e) => setEditForm((p) => ({ ...p, capacity: e.target.value }))}
                    className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso focus:outline-none focus:border-rust"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs tracking-widest uppercase text-tan">Location</label>
                  <input
                    value={editForm.location}
                    onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
                    placeholder="Venue name or address"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-body text-xs tracking-widest uppercase text-tan">Partner(s)</label>
                  <input
                    value={editForm.partners}
                    onChange={(e) => setEditForm((p) => ({ ...p, partners: e.target.value }))}
                    className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
                    placeholder="Collaborator or brand names"
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.allow_guests}
                  onChange={(e) => setEditForm((p) => ({ ...p, allow_guests: e.target.checked }))}
                  className="w-4 h-4 accent-rust"
                />
                <span className="font-body text-sm text-espresso">Allow guests (+1 or +2)</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="font-body text-sm font-medium px-6 py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
                >
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="font-body text-sm px-4 py-2.5 border border-tan/30 text-tan rounded hover:text-espresso transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl sm:text-2xl text-espresso font-light">Events</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="font-body text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-5 sm:py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200"
        >
          {adding ? "Cancel" : "+ Add Event"}
        </button>
      </div>

      {adding && (
        <form onSubmit={addEvent} className="bg-white border border-tan/20 rounded-lg p-6 space-y-4 shadow-sm">
          <p className="font-body text-sm font-medium text-espresso">New Event</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-body text-xs tracking-widest uppercase text-tan">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
                placeholder="Event name"
              />
            </div>
            <div className="space-y-1">
              <label className="font-body text-xs tracking-widest uppercase text-tan">Start Time *</label>
              <input
                required
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso focus:outline-none focus:border-rust"
              />
            </div>
            <div className="space-y-1">
              <label className="font-body text-xs tracking-widest uppercase text-tan">End Time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso focus:outline-none focus:border-rust"
              />
            </div>
            <div className="space-y-1">
              <label className="font-body text-xs tracking-widest uppercase text-tan">Capacity *</label>
              <input
                required
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
                placeholder="100"
              />
            </div>
            <div className="space-y-1">
              <label className="font-body text-xs tracking-widest uppercase text-tan">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
                placeholder="Venue name or address"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="font-body text-xs tracking-widest uppercase text-tan">Partner(s)</label>
              <input
                value={form.partners}
                onChange={(e) => setForm((p) => ({ ...p, partners: e.target.value }))}
                className="w-full border border-tan/30 rounded px-3 py-2 text-sm text-espresso placeholder-tan/40 focus:outline-none focus:border-rust"
                placeholder="Collaborator or brand names"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allow_guests}
              onChange={(e) => setForm((p) => ({ ...p, allow_guests: e.target.checked }))}
              className="w-4 h-4 accent-rust"
            />
            <span className="font-body text-sm text-espresso">Allow guests (+1 or +2)</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="font-body text-sm font-medium px-6 py-2.5 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add Event"}
          </button>
        </form>
      )}

      {events.length === 0 ? (
        <p className="font-body text-base text-tan italic">No events yet.</p>
      ) : (() => {
        const now = new Date();
        const upcoming = events
          .filter((ev) => new Date(ev.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const past = events
          .filter((ev) => new Date(ev.date) < now)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const EventTable = ({ rows, isPast }: { rows: AdminEvent[]; isPast: boolean }) => (
          <div className="overflow-x-auto bg-white rounded-lg border border-tan/20 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-tan/20 bg-ivory divide-x divide-tan/10">
                  {["Event", "Date", "Time", "Location", "Partner(s)", "RSVPs", "Attendees", "Capacity", "Waitlist", isPast ? "Checked In" : "Guests", "", ""].map((h) => (
                    <th key={h} className="font-body text-[10px] sm:text-xs tracking-widest uppercase text-tan pb-2 pt-2 px-3 sm:pb-3 sm:pt-3 sm:px-4 font-medium whitespace-nowrap text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((ev) => (
                  <tr key={ev.id} className="border-b border-tan/10 divide-x divide-tan/10 hover:bg-ivory/60 transition-colors">
                    <td className="font-body text-xs sm:text-sm font-medium py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                      <a href={`/admin/events/${ev.id}`} className="text-rust hover:text-ember transition-colors">{ev.title}</a>
                    </td>
                    <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center whitespace-nowrap">
                      {formatDateShort(ev.date)}
                    </td>
                    <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center whitespace-nowrap">
                      {formatTimeRange(ev.date, ev.end_time)}
                    </td>
                    <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{ev.location ?? "—"}</td>
                    <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{ev.partners ?? "—"}</td>
                    <td className="font-body text-xs sm:text-sm text-espresso font-medium py-3 px-3 sm:py-3.5 sm:px-4 text-center">{ev.rsvp_count}</td>
                    <td className="font-body text-xs sm:text-sm text-espresso font-medium py-3 px-3 sm:py-3.5 sm:px-4 text-center">{ev.checked_in_count ?? 0}</td>
                    <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{ev.capacity}</td>
                    <td className="font-body text-xs sm:text-sm py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                      {ev.waitlist_count > 0
                        ? <span className="text-amber font-medium">{ev.waitlist_count}</span>
                        : <span className="text-tan/40">0</span>}
                    </td>
                    <td className="font-body text-xs sm:text-sm text-tan py-3 px-3 sm:py-3.5 sm:px-4 text-center">{isPast ? `${ev.checked_in_count ?? 0} (${ev.rsvp_count > 0 ? Math.round(((ev.checked_in_count ?? 0) / ev.rsvp_count) * 100) : 0}%)` : ev.allow_guests ? "Yes" : "No"}</td>
                    <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                      <button onClick={() => openEdit(ev)} className="font-body text-xs text-tan/50 hover:text-espresso transition-colors">
                        Edit
                      </button>
                    </td>
                    <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                      <button onClick={() => deleteEvent(ev.id)} disabled={deleting === ev.id} className="font-body text-xs text-rust/50 hover:text-rust transition-colors disabled:opacity-40">
                        {deleting === ev.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <p className="font-body text-xs tracking-widest uppercase text-tan">Upcoming</p>
                <EventTable rows={upcoming} isPast={false} />
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-3">
                <p className="font-body text-xs tracking-widest uppercase text-tan">Past</p>
                <EventTable rows={past} isPast={true} />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function ReferralsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/contacts?status=pending")
      .then((r) => r.json())
      .then(async (pendingData) => {
        const approvedRes = await fetch("/api/admin/contacts?status=approved");
        const approvedData = await approvedRes.json();
        const all = [...(pendingData.contacts ?? []), ...(approvedData.contacts ?? [])];
        setContacts(all);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="font-body text-sm text-tan animate-pulse">Loading…</p>;

  const counts: Record<string, number> = {};
  const referred: Record<string, Contact[]> = {};
  for (const c of contacts) {
    if (!c.referred_by?.trim()) continue;
    const key = c.referred_by.trim().toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
    (referred[key] ??= []).push(c);
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="font-display text-xl sm:text-2xl text-espresso font-light mb-1">Referrals</h2>
        <p className="font-body text-sm text-tan">Who's bringing people in, ranked by number of referrals. Tap a row to see who they referred.</p>
      </div>

      {sorted.length === 0 ? (
        <p className="font-body text-base text-tan italic">No referrals recorded yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-tan/20 shadow-sm overflow-hidden">
          {sorted.map(([name, count], i) => {
            const isOpen = expanded === name;
            return (
              <div key={name} className={i !== sorted.length - 1 ? "border-b border-tan/10" : ""}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : name)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivory/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-body text-xs text-tan/50 w-5 text-right">{i + 1}</span>
                    <span className="font-body text-sm font-medium text-espresso capitalize">{name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm text-tan">
                      {count} {count === 1 ? "referral" : "referrals"}
                    </span>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`shrink-0 text-tan transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="bg-ivory/50 px-5 py-3 border-t border-tan/10 max-h-64 overflow-y-auto space-y-2">
                    {referred[name].map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-espresso">{capitalizeName(r.name)}</span>
                        <span className="font-body text-xs text-tan capitalize">{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageTab() {
  const [template, setTemplate] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [waitlistTemplate, setWaitlistTemplate] = useState("");
  const [waitlistSaved, setWaitlistSaved] = useState(false);
  const [waitlistSaving, setWaitlistSaving] = useState(false);

  const segments = getSegmentCount(template);
  const costPerSend = segments > 0 ? (segments * TWILIO_PRICE_PER_SEGMENT).toFixed(2) : null;

  const waitlistSegments = getSegmentCount(waitlistTemplate);
  const waitlistCostPerSend = waitlistSegments > 0 ? (waitlistSegments * TWILIO_PRICE_PER_SEGMENT).toFixed(2) : null;

  useEffect(() => {
    fetch("/api/admin/sms-template")
      .then((r) => r.json())
      .then((d) => setTemplate(d.template ?? ""));

    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setWaitlistTemplate(
        d.waitlist_sms_template ?? "Good news, {name}! A spot just opened up at The View for {event} on {date} at {location}. You're officially on the list - see you there."
      ));
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

  async function saveWaitlist() {
    setWaitlistSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "waitlist_sms_template", value: waitlistTemplate }),
    });
    setWaitlistSaving(false);
    setWaitlistSaved(true);
    setTimeout(() => setWaitlistSaved(false), 3000);
  }

  return (
    <div className="max-w-xl space-y-10">
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl text-espresso font-light mb-1">Welcome Message</h2>
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
          <div className="flex items-center justify-between font-body text-xs text-tan">
            <span>{template.length} characters · {segments} {segments === 1 ? "segment" : "segments"}</span>
            {costPerSend !== null && (
              <span>Cost per approval: <strong className="text-espresso">${costPerSend}</strong></span>
            )}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="font-body text-sm font-medium px-6 py-3 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Message"}
        </button>
      </div>

      <div className="space-y-4 pt-6 border-t border-tan/15">
        <div>
          <h2 className="font-display text-xl sm:text-2xl text-espresso font-light mb-1">Waitlist Message</h2>
          <p className="font-body text-sm text-tan leading-relaxed">
            Sent automatically when you admit someone off an event's waitlist. Use{" "}
            <span className="text-rust font-mono bg-rust/10 px-1 rounded">{"{name}"}</span>,{" "}
            <span className="text-rust font-mono bg-rust/10 px-1 rounded">{"{event}"}</span>,{" "}
            <span className="text-rust font-mono bg-rust/10 px-1 rounded">{"{date}"}</span>, and{" "}
            <span className="text-rust font-mono bg-rust/10 px-1 rounded">{"{location}"}</span>{" "}
            to personalize it.
          </p>
        </div>

        <div className="space-y-1">
          <textarea
            value={waitlistTemplate}
            onChange={(e) => setWaitlistTemplate(e.target.value)}
            rows={6}
            placeholder={`Good news, {name}! A spot just opened up at The View for {event} on {date} at {location}. You're officially on the list - see you there.`}
            className="w-full bg-white border border-tan/30 rounded-lg px-4 py-3 font-body text-sm text-black placeholder-tan/60 focus:outline-none focus:border-rust resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between font-body text-xs text-tan">
            <span>{waitlistTemplate.length} characters · {waitlistSegments} {waitlistSegments === 1 ? "segment" : "segments"}</span>
            {waitlistCostPerSend !== null && (
              <span>Cost per promotion: <strong className="text-espresso">${waitlistCostPerSend}</strong></span>
            )}
          </div>
        </div>

        <button
          onClick={saveWaitlist}
          disabled={waitlistSaving}
          className="font-body text-sm font-medium px-6 py-3 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
        >
          {waitlistSaving ? "Saving…" : waitlistSaved ? "Saved ✓" : "Save Message"}
        </button>
      </div>
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
  const [optedOutCount, setOptedOutCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/admin/text-blast")
      .then((r) => r.json())
      .then((d) => {
        setMemberCount(d.memberCount ?? 0);
        setOptedOutCount(d.optedOutCount ?? 0);
      });
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
        <h2 className="font-display text-xl sm:text-2xl text-espresso font-light mb-1">Text Blasts</h2>
        <p className="font-body text-sm text-tan leading-relaxed">
          Send a message to all approved members at once — event announcements, reminders, or any update you want to share.
        </p>
      </div>

      {memberCount !== null && (
        <div className="bg-white border border-tan/25 rounded-lg px-3 sm:px-5 py-4 grid grid-cols-3 divide-x divide-tan/20">
          <div className="pr-3 sm:pr-5">
            <p className="font-display text-xl sm:text-3xl text-espresso font-light">{memberCount + optedOutCount}</p>
            <p className="font-body text-xs text-tan mt-0.5">Total approved</p>
          </div>
          <div className="px-3 sm:px-5">
            <p className="font-display text-xl sm:text-3xl text-tan font-light">{optedOutCount}</p>
            <p className="font-body text-xs text-tan mt-0.5">Opted out</p>
          </div>
          <div className="pl-3 sm:pl-5">
            <p className="font-display text-xl sm:text-3xl text-espresso font-light">{memberCount}</p>
            <p className="font-body text-xs text-tan mt-0.5">Will receive</p>
          </div>
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
          {result.failures.length > 0 && <p className="mt-1">Failed: {result.failures.join(", ")}</p>}
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

function SettingsTab() {
  const [portalEnabled, setPortalEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const [inviteTemplate, setInviteTemplate] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteSaved, setInviteSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setPortalEnabled(d.members_portal_enabled === "true");
        setInviteTemplate(
          d.invite_sms_template ?? "You should apply for The View — a members-only night out. {link}"
        );
      });
  }, []);

  async function togglePortal() {
    if (portalEnabled === null) return;
    setSaving(true);
    const newVal = !portalEnabled;
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "members_portal_enabled", value: String(newVal) }),
    });
    setPortalEnabled(newVal);
    setSaving(false);
  }

  async function saveInviteTemplate() {
    setInviteSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "invite_sms_template", value: inviteTemplate }),
    });
    setInviteSaving(false);
    setInviteSaved(true);
    setTimeout(() => setInviteSaved(false), 3000);
  }

  return (
    <div className="max-w-xl space-y-8">
      <h2 className="font-display text-xl sm:text-2xl text-espresso font-light">Settings</h2>

      <div className="bg-white border border-tan/20 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-body text-sm font-medium text-espresso">Member Portal</p>
            <p className="font-body text-xs text-tan leading-relaxed">
              When enabled, approved members can log in at{" "}
              <span className="font-mono text-espresso">theview.la/members</span>{" "}
              to see their RSVPs and share referral links. When disabled, the page shows a closed message.
            </p>
          </div>
          <button
            onClick={togglePortal}
            disabled={saving || portalEnabled === null}
            className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${portalEnabled ? "bg-espresso" : "bg-tan/30"}`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${portalEnabled ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>
        <p className={`font-body text-xs font-medium ${portalEnabled ? "text-green-600" : "text-tan/50"}`}>
          {portalEnabled === null ? "Loading…" : portalEnabled ? "Portal is live" : "Portal is off"}
        </p>
      </div>

      <div className="bg-white border border-tan/20 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <p className="font-body text-sm font-medium text-espresso">Invite a Friend Text</p>
          <p className="font-body text-xs text-tan leading-relaxed">
            After someone requests access, they can tap "Invite a Friend" to open their texting app with this message pre-filled. Use{" "}
            <span className="text-rust font-mono bg-rust/10 px-1 rounded">{"{link}"}</span>{" "}
            to include their personal referral link.
          </p>
        </div>

        <div className="space-y-1">
          <textarea
            value={inviteTemplate}
            onChange={(e) => setInviteTemplate(e.target.value)}
            rows={4}
            placeholder="You should apply for The View — a members-only night out. {link}"
            className="w-full bg-white border border-tan/30 rounded-lg px-4 py-3 font-body text-sm text-black placeholder-tan/60 focus:outline-none focus:border-rust resize-none leading-relaxed"
          />
          <p className="font-body text-xs text-tan">{inviteTemplate.length} characters</p>
        </div>

        <button
          onClick={saveInviteTemplate}
          disabled={inviteSaving}
          className="font-body text-sm font-medium px-6 py-3 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
        >
          {inviteSaving ? "Saving…" : inviteSaved ? "Saved ✓" : "Save Message"}
        </button>
      </div>
    </div>
  );
}
