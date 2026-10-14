import { createHmac, timingSafeEqual } from "crypto";

// Short-lived proof that whoever is opting a contact in to texts is the
// same person who just submitted the signup form. The contact id alone
// isn't enough — it's shared in "Invite a Friend" referral links.
const VALID_MS = 60 * 60 * 1000;

function sign(contactId: string, issuedAt: number): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("Missing signing secret.");
  return createHmac("sha256", secret).update(`sms-opt-in:${contactId}:${issuedAt}`).digest("hex");
}

export function createOptInToken(contactId: string): string {
  const issuedAt = Date.now();
  return `${issuedAt}.${sign(contactId, issuedAt)}`;
}

export function verifyOptInToken(contactId: string, token: unknown): boolean {
  if (typeof token !== "string") return false;
  const [issuedRaw, sig] = token.split(".");
  const issuedAt = Number(issuedRaw);
  if (!issuedAt || !sig || Date.now() - issuedAt > VALID_MS) return false;
  const expected = Buffer.from(sign(contactId, issuedAt));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
