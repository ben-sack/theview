import nameGenderData from "./nameGenderData.json";

export type GenderEstimate = "male" | "female" | "unsure";

const data = nameGenderData as Record<string, { m: number; f: number }>;

const CONFIDENCE_THRESHOLD = 0.85;

export function estimateGender(fullName: string | null | undefined): GenderEstimate {
  const firstName = fullName?.trim().split(/\s+/)[0]?.toLowerCase();
  if (!firstName) return "unsure";

  const entry = data[firstName];
  if (!entry) return "unsure";

  const total = entry.m + entry.f;
  if (total === 0) return "unsure";

  const maleRatio = entry.m / total;
  if (maleRatio >= CONFIDENCE_THRESHOLD) return "male";
  if (maleRatio <= 1 - CONFIDENCE_THRESHOLD) return "female";
  return "unsure";
}

export function tallyGender(names: (string | null | undefined)[]) {
  const counts = { male: 0, female: 0, unsure: 0 };
  for (const name of names) {
    counts[estimateGender(name)]++;
  }
  return counts;
}

function isGenderEstimate(value: unknown): value is GenderEstimate {
  return value === "male" || value === "female" || value === "unsure";
}

export function resolveGender(
  fullName: string | null | undefined,
  override: string | null | undefined
): GenderEstimate {
  if (isGenderEstimate(override)) return override;
  return estimateGender(fullName);
}

export function tallyResolvedGender(
  people: { name: string | null | undefined; gender_override?: string | null }[]
) {
  const counts = { male: 0, female: 0, unsure: 0 };
  for (const p of people) {
    counts[resolveGender(p.name, p.gender_override)]++;
  }
  return counts;
}
