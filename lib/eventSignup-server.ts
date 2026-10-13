import { supabase } from "@/lib/supabase";

const SIGNUP_EVENT_FIELDS =
  "id, title, date, end_time, city, partners, capacity, signup_enabled, signup_slug, signup_flyer_url, signup_headline, signup_copy";

export async function getSignupEvent(slug: string) {
  const { data: event } = await supabase
    .from("events")
    .select(SIGNUP_EVENT_FIELDS)
    .eq("signup_slug", slug.toLowerCase())
    .maybeSingle();
  return event;
}
