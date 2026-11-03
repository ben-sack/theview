"use client";
import { useEffect, useRef, useState } from "react";
import { getSegmentCount } from "@/lib/sms";
import { TWILIO_PRICE_PER_SEGMENT } from "@/components/BlastAttachments";

type Message = { id: string; from: "them" | "us"; body: string; keyword: string | null; at: string };
type Conversation = {
  phone: string;
  name: string | null;
  status: string | null;
  optedOut: boolean;
  unread: number;
  lastAt: string;
  messages: Message[];
};

const KEYWORD_NOTES: Record<string, string> = {
  stop: "Opted out of texts",
  start: "Opted back in to texts",
  help: "Asked for help — sent the automatic help reply",
};

function formatPhone(phone: string) {
  const m = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " · " +
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Texts people send to our number, one conversation per person, with a
// reply box. STOP/START/HELP are shown as small notes, not messages.
export function MessagesTab({ onUnreadChange }: { onUnreadChange: (n: number) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openPhone, setOpenPhone] = useState<string | null>(null);
  const [showKeywordOnly, setShowKeywordOnly] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setConversations(d.conversations ?? []);
        setLoading(false);
      })
      .catch(() => { setError("Couldn't load messages."); setLoading(false); });
  }, []);

  const open = conversations.find((c) => c.phone === openPhone) ?? null;

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "end" });
  }, [openPhone, open?.messages.length]);

  function openConversation(c: Conversation) {
    setOpenPhone(c.phone);
    setDraft("");
    setSendError("");
    if (c.unread > 0) {
      fetch("/api/admin/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: c.phone }),
      });
      const next = conversations.map((x) => (x.phone === c.phone ? { ...x, unread: 0 } : x));
      setConversations(next);
      onUnreadChange(next.reduce((sum, x) => sum + x.unread, 0));
    }
  }

  async function sendReply() {
    if (!open || !draft.trim()) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/admin/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: open.phone, body: draft }),
      });
      const d = await res.json();
      if (!res.ok) { setSendError(d.error ?? "Failed to send."); return; }
      const msg: Message = { id: d.reply.id, from: "us", body: d.reply.body, keyword: null, at: d.reply.sent_at };
      setConversations((prev) =>
        prev.map((c) => (c.phone === open.phone ? { ...c, messages: [...c.messages, msg], lastAt: msg.at } : c))
      );
      setDraft("");
    } catch {
      setSendError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="font-body text-sm text-tan animate-pulse">Loading…</p>;
  if (error) return <p className="font-body text-sm text-rust">{error}</p>;

  // People whose only texts were STOP/START/HELP are hidden by default.
  const isKeywordOnly = (c: Conversation) => c.messages.every((m) => m.from === "them" && m.keyword);
  const visible = conversations.filter((c) => showKeywordOnly || !isKeywordOnly(c));
  const hiddenCount = conversations.length - conversations.filter((c) => !isKeywordOnly(c)).length;

  const segments = getSegmentCount(draft);
  const label = (c: Conversation) => c.name ?? formatPhone(c.phone);

  return (
    <div className="bg-white rounded-lg border border-tan/20 shadow-sm overflow-hidden md:grid md:grid-cols-[18rem_1fr] md:h-[70vh]">
      {/* Conversation list — on mobile it's replaced by the open thread */}
      <div className={`${open ? "hidden md:flex" : "flex"} flex-col border-tan/20 md:border-r min-h-0`}>
        <div className="px-4 py-3 border-b border-tan/20 flex items-center justify-between gap-2">
          <p className="font-body text-sm font-medium text-espresso">Texts to (866) 450-0632</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-tan/10">
          {visible.length === 0 ? (
            <p className="font-body text-sm text-tan italic px-4 py-6 text-center">No messages yet.</p>
          ) : (
            visible.map((c) => {
              const last = c.messages[c.messages.length - 1];
              const preview = last.keyword ? KEYWORD_NOTES[last.keyword] ?? last.body : `${last.from === "us" ? "You: " : ""}${last.body}`;
              return (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => openConversation(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-ivory/60 transition-colors ${openPhone === c.phone ? "bg-ivory" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-body text-sm truncate ${c.unread ? "font-semibold text-espresso" : "text-espresso"}`}>{label(c)}</span>
                    <span className="font-body text-[11px] text-tan shrink-0">{formatWhen(c.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={`font-body text-xs truncate ${c.unread ? "text-espresso" : "text-tan"}`}>{preview}</span>
                    {c.unread > 0 && (
                      <span className="bg-rust text-ivory text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full shrink-0">{c.unread}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowKeywordOnly((v) => !v)}
            className="font-body text-[11px] text-tan hover:text-rust px-4 py-2 border-t border-tan/20 text-left"
          >
            {showKeywordOnly ? "Hide" : "Show"} {hiddenCount} STOP/START-only {hiddenCount === 1 ? "person" : "people"}
          </button>
        )}
      </div>

      {/* Open conversation */}
      {open ? (
        <div className="flex flex-col min-h-0 h-[75vh] md:h-auto">
          <div className="px-4 py-3 border-b border-tan/20 flex items-center gap-3">
            <button type="button" onClick={() => setOpenPhone(null)} className="md:hidden font-body text-sm text-rust">
              ← Back
            </button>
            <div className="min-w-0">
              <p className="font-body text-sm font-medium text-espresso truncate">{label(open)}</p>
              <p className="font-body text-[11px] text-tan">
                {open.name ? formatPhone(open.phone) : "Not in your contacts"}
                {open.status && open.status !== "approved" ? ` · ${open.status}` : ""}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-ivory/40">
            {open.messages.map((m) =>
              m.keyword ? (
                <p key={m.id} className="font-body text-[11px] text-tan text-center">
                  {KEYWORD_NOTES[m.keyword] ?? m.body} · {formatWhen(m.at)}
                </p>
              ) : (
                <div key={m.id} className={`flex ${m.from === "us" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    <div
                      className={`font-body text-sm leading-relaxed whitespace-pre-wrap px-3 py-2 rounded-lg ${
                        m.from === "us" ? "bg-espresso text-ivory" : "bg-white border border-tan/20 text-espresso"
                      }`}
                    >
                      {m.body}
                    </div>
                    <p className={`font-body text-[10px] text-tan mt-0.5 ${m.from === "us" ? "text-right" : ""}`}>{formatWhen(m.at)}</p>
                  </div>
                </div>
              )
            )}
            <div ref={threadEnd} />
          </div>

          <div className="border-t border-tan/20 p-3 space-y-2">
            {open.optedOut ? (
              <p className="font-body text-xs text-tan italic">This person has opted out of texts, so you can&apos;t reply. They can text START to opt back in.</p>
            ) : (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Write a reply…"
                  className="w-full bg-ivory border border-tan/30 rounded px-3 py-2 font-body text-sm text-black placeholder-tan/40 focus:outline-none focus:border-rust resize-none leading-relaxed"
                />
                {sendError && <p className="font-body text-xs text-rust">{sendError}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-body text-[11px] text-tan">
                    {draft.length > 0 ? `${draft.length} characters · ${segments} ${segments === 1 ? "segment" : "segments"} · ~$${(segments * TWILIO_PRICE_PER_SEGMENT).toFixed(3)}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                    className="font-body text-sm font-medium px-5 py-2 bg-espresso text-ivory rounded hover:bg-rust transition-colors duration-200 disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex items-center justify-center">
          <p className="font-body text-sm text-tan italic">Pick a conversation to read and reply.</p>
        </div>
      )}
    </div>
  );
}
