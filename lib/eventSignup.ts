import { formatEventDateShort } from "@/lib/messageFormat";

export const DEFAULT_SIGNUP_APPROVED_TEMPLATE =
  "Welcome to The View, {name}. You're in and on the list for {event} on {date}. Save this contact for event invites and updates: https://theview.la/contact.vcf Msg&Data rates may apply.";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// An event's public signup page stays open until the event is over —
// end_time if set, otherwise 6 hours after it starts.
export function eventHasEnded(event: { date: string; end_time: string | null }): boolean {
  const end = event.end_time
    ? new Date(event.end_time).getTime()
    : new Date(event.date).getTime() + 6 * 60 * 60 * 1000;
  return Date.now() > end;
}

export function fillSignupApprovedTemplate(
  template: string,
  name: string,
  event: { title: string; date: string }
): string {
  return template
    .replace(/\{name\}/gi, name.split(" ")[0])
    .replace(/\{event\}/gi, event.title)
    .replace(/\{date\}/gi, formatEventDateShort(new Date(event.date)));
}
