export function formatDoorTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const ampm = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return minute === "00" ? `${hour}${ampm}` : `${hour}:${minute}${ampm}`;
}

export function formatEventDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}
