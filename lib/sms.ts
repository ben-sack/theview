// GSM 03.38 basic character set — the "safe" 160-char-per-segment alphabet.
// Any character outside this set (emoji, em/en dashes, curly quotes, most
// accented characters beyond this list, etc.) forces the whole message into
// UCS-2 encoding, which cuts the segment limit from 160 down to 70 characters
// (153/67 for multi-segment messages) — carriers bill each segment the same
// regardless of encoding, so this silently multiplies real cost.
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
// Extended GSM-7 chars — valid, but each costs 2 septets (an escape + the char).
const GSM7_EXTENDED = "^{}\\[~]|€";

const GSM7_BASIC_SET = new Set(GSM7_BASIC);
const GSM7_EXTENDED_SET = new Set(GSM7_EXTENDED);

export function isGsm7Compatible(text: string): boolean {
  return [...text].every((c) => GSM7_BASIC_SET.has(c) || GSM7_EXTENDED_SET.has(c));
}

function gsm7EffectiveLength(text: string): number {
  let len = 0;
  for (const c of text) len += GSM7_EXTENDED_SET.has(c) ? 2 : 1;
  return len;
}

// Real SMS segment count, matching how carriers actually bill: GSM-7 messages
// get 160 chars (single) / 153 per segment (multi-part); anything requiring
// UCS-2 (emoji, em dashes, curly quotes, etc.) drops to 70 / 67.
export function getSegmentCount(text: string): number {
  if (text.length === 0) return 0;

  if (isGsm7Compatible(text)) {
    const len = gsm7EffectiveLength(text);
    return len <= 160 ? 1 : Math.ceil(len / 153);
  }

  return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
}
