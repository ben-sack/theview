import { supabase } from "@/lib/supabase";
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

// Resolves a "Send Test" number. If it belongs to an existing contact, their
// real name is used so {name} personalizes the way members will see it.
export async function resolveTestRecipient(
  testPhone: unknown
): Promise<{ phone: string; contactId: string | null; name: string } | null> {
  const phone = normalizePhone(String(testPhone ?? ""));
  if (!isUSPhoneNumber(phone)) return null;

  const { data } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  return { phone, contactId: data?.id ?? null, name: data?.name ?? "there" };
}
