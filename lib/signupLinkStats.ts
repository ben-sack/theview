import { supabase } from "@/lib/supabase";

// Link sources tracked on public signup pages. Must match the keys the
// signup page sends (SOCIAL_REFS in EventSignupContent, plus friend/direct).
export const LINK_SOURCES = ["tiktok", "instagram", "friend", "direct"] as const;

export function cleanSource(source: unknown): string {
  return typeof source === "string" && (LINK_SOURCES as readonly string[]).includes(source)
    ? source
    : "direct";
}

// Best-effort — tracking must never break a signup.
export async function recordLinkEvent(eventId: string, source: unknown, kind: "visit" | "submit") {
  const { error } = await supabase
    .from("signup_link_events")
    .insert({ event_id: eventId, source: cleanSource(source), kind });
  if (error) console.error("Signup link tracking error:", error);
}
