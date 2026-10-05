import { normalizePhone, isUSPhoneNumber } from "@/lib/phone";

// Only photos uploaded through /api/admin/text-blast/media are allowed —
// Twilio fetches the URL itself, so it must be our own public storage.
export function isValidMediaUrl(mediaUrl: unknown): boolean {
  if (mediaUrl === undefined || mediaUrl === null || mediaUrl === "") return true;
  const prefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/`;
  return typeof mediaUrl === "string" && mediaUrl.startsWith(prefix);
}

export function mediaParams(mediaUrl: unknown) {
  return typeof mediaUrl === "string" && mediaUrl ? { mediaUrl: [mediaUrl] } : {};
}

// Normalizes a "Send Test" number, or returns null if it isn't a US number.
export function parseTestPhone(testPhone: unknown): string | null {
  const phone = normalizePhone(String(testPhone ?? ""));
  return isUSPhoneNumber(phone) ? phone : null;
}
