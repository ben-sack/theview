export function normalizePhone(raw: string): string {
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

// True for a plausible US/Canada (NANP) number: +1 followed by a 10-digit
// number whose area code doesn't start with 0 or 1. This app can only
// reliably text/receive-replies-from NANP numbers on a US toll-free number
// (see project notes on international SMS), so anything else is rejected
// at signup with a clear message rather than silently failing later.
export function isUSPhoneNumber(e164: string): boolean {
  return /^\+1[2-9]\d{9}$/.test(e164);
}
