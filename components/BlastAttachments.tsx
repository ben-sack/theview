"use client";
import { useState } from "react";
import { resizeImage } from "@/lib/resizeImage";

// Twilio's US toll-free rates. Real bills also include a separate
// per-message carrier surcharge (varies by recipient's carrier): roughly
// $0.003–0.005 for a text segment, $0.007–0.010 for a picture message.
export const TWILIO_PRICE_PER_SEGMENT = 0.0083;
// A picture message (MMS) is one flat price for the photo plus up to
// 1,600 characters of text — no per-segment billing.
export const TWILIO_PRICE_PER_MMS = 0.022;
export const MMS_MAX_CHARS = 1600;
// Every blast appends this footer server-side.
export const OPT_OUT_FOOTER = "\n\nReply STOP to opt out";

export type BlastPhoto = { url: string; sizeKb: number };

export function BlastPhotoPicker({
  photo,
  onChange,
  onUploadingChange,
}: {
  photo: BlastPhoto | null;
  onChange: (photo: BlastPhoto | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function setBusy(busy: boolean) {
    setUploading(busy);
    onUploadingChange?.(busy);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { blob } = await resizeImage(file);
      const form = new FormData();
      form.append("file", blob, "photo.jpg");
      const res = await fetch("/api/admin/text-blast/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onChange({ url: data.url, sizeKb: Math.round(blob.size / 1024) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="font-body text-xs font-medium text-espresso">Photo (optional)</p>
      {photo ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="Attached photo" className="w-28 h-28 object-cover rounded border border-tan/30" />
          <div className="font-body text-xs text-tan space-y-2">
            <p>{photo.sizeKb} KB · sends as a picture message (${TWILIO_PRICE_PER_MMS.toFixed(3)} each instead of ${TWILIO_PRICE_PER_SEGMENT} per text segment)</p>
            <button type="button" onClick={() => onChange(null)} className="text-rust hover:underline">Remove photo</button>
          </div>
        </div>
      ) : (
        <label className={`inline-block font-body text-sm px-4 py-2 border border-tan/40 rounded cursor-pointer hover:border-rust transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          {uploading ? "Uploading…" : "Attach a photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
          />
        </label>
      )}
      {error && <p className="font-body text-xs text-rust">{error}</p>}
    </div>
  );
}

// Sends the current message (and photo) to a single number via the same
// endpoint as the real blast, passing `testPhone` so no members are texted.
export function BlastTestSend({
  endpoint,
  payload,
  disabled,
  hasPhoto,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  disabled: boolean;
  hasPhoto: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function sendTest() {
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, testPhone: phone }),
      });
      const data = await res.json();
      if (!res.ok) setStatus({ ok: false, text: data.error || "Test failed to send." });
      else if (data.sent > 0) setStatus({ ok: true, text: "Test sent." });
      else setStatus({ ok: false, text: "Test failed to send." });
    } catch {
      setStatus({ ok: false, text: "Lost connection — check your phone before retrying." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-ivory/60 border border-tan/25 rounded-lg px-4 py-4 space-y-2">
      <p className="font-body text-xs font-medium text-espresso">Send a test first</p>
      <p className="font-body text-xs text-tan">Sends this exact message{hasPhoto ? " and photo" : ""} to one number only — no members are texted.</p>
      <div className="flex flex-wrap gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(310) 555-0123"
          className="flex-1 min-w-0 bg-white border border-tan/30 rounded px-3 py-2 font-body text-sm text-black placeholder-tan/60 focus:outline-none focus:border-rust"
        />
        <button
          type="button"
          onClick={sendTest}
          disabled={disabled || sending || !phone.trim()}
          className="font-body text-sm font-medium px-4 py-2 border border-espresso text-espresso rounded hover:bg-espresso hover:text-ivory transition-colors duration-200 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send Test"}
        </button>
      </div>
      {status && <p className={`font-body text-xs ${status.ok ? "text-green-700" : "text-rust"}`}>{status.text}</p>}
    </div>
  );
}
