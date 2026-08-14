import { supabase } from "./supabase";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // excludes ambiguous chars: 0/o, 1/l/i
const CODE_LENGTH = 6;

function randomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export async function getRsvpShortLink(eventId: string, contactId: string): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theview.la";

  const { data: existing } = await supabase
    .from("short_links")
    .select("code")
    .eq("event_id", eventId)
    .eq("contact_id", contactId)
    .single();

  if (existing) return `${siteUrl}/r/${existing.code}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase
      .from("short_links")
      .insert([{ code, event_id: eventId, contact_id: contactId }]);
    if (!error) return `${siteUrl}/r/${code}`;
  }

  // Fallback: if code generation somehow kept colliding, just use the real link
  return `${siteUrl}/rsvp/${eventId}?c=${contactId}`;
}
