/**
 * Phone-number utilities for the public profile.
 *
 * The pet's profile page is consented public exposure of the guardian's
 * contact, but that doesn't mean we have to make scraping trivial. The
 * display string is masked so a screenshot or casual HTML view doesn't leak
 * the full number — the action buttons (`tel:` / `wa.me/` / `t.me/+`) still
 * target the real e164 so a real human tapping them gets through with no
 * extra steps.
 *
 * Scraping the raw HTML can still recover the e164 from the `href` of the
 * action buttons. Masking the visible text is a first layer, not a complete
 * defense — for deeper protection, the next step is obfuscating the `href`
 * via a small client-side reveal handler.
 */

/** Ways a guardian can offer to be reached on a number, in the order the form lists them. */
export const SELECTABLE_PHONE_CHANNELS = ["call", "whatsapp", "telegram"] as const;
export type SelectablePhoneChannel = (typeof SELECTABLE_PHONE_CHANNELS)[number];

/** Numbers one guardian can register. The first is the primary one. */
export const MAX_PHONES_PER_GUARDIAN = 3;

/**
 * Brazilian phone mask for the form input: `(DD) XXXXX-XXXX` for 11 digits
 * (mobile), `(DD) XXXX-XXXX` for up to 10 (landline).
 *
 * A pasted international number (`+55 48 98111-1111`, `5548981111111`) has
 * its leading country code dropped instead of being cut at 11 digits, which
 * would keep the "55" and lose the end of the number. Typing can't reach 12
 * digits (the mask stops at 11), so 12 or more starting with 55 is a paste —
 * unless the value already starts with the mask's "(": that is the field's own
 * output plus a keystroke (a DDD-55 number with a stray extra digit), where "55"
 * is the area code and must stay. Any other extra digits are dropped.
 */
export function applyPhoneMask(value: string): string {
  let digits = value.replace(/\D/g, "");
  const alreadyMasked = value.trimStart().startsWith("(");
  if (!alreadyMasked && digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${ddd}) ${local}`;
  // 11 digits → 9-digit mobile: (DD) 9XXXX-XXXX
  if (digits.length === 11) return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
  // ≤10 digits → 8-digit landline: (DD) XXXX-XXXX
  return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
}

/** Digits-only E.164 without "+" for a number typed in Brazil (adds the 55 country code when missing). */
export function toE164Brazil(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

/**
 * Whether a typed number has the shape of a Brazilian phone: DDD plus 8 or 9
 * digits (10–11 digits), with or without the country code. It checks the
 * length only — not that the DDD exists — which is enough to catch a number
 * cut short or typed as text before it becomes a dead `tel:` / `wa.me` link.
 */
export function isPlausibleBrazilPhone(phone: string): boolean {
  const e164 = toE164Brazil(phone);
  return e164.length === 12 || e164.length === 13;
}

export type PhoneInputProblem = "incomplete" | "no_channel";

/**
 * What stops a phone row from being submitted, if anything. A blank number is
 * no problem — an extra row left empty is ignored.
 */
export function phoneInputProblem(display: string, hasChannel: boolean): PhoneInputProblem | null {
  if (!display.trim()) return null;
  if (!isPlausibleBrazilPhone(display)) return "incomplete";
  if (!hasChannel) return "no_channel";
  return null;
}

/** `tel:` link for an E.164 number (no "+"). */
export function telUrl(e164: string): string {
  return `tel:+${e164}`;
}

/** `wa.me` chat link for an E.164 number (no "+"). */
export function whatsappUrl(e164: string): string {
  return `https://wa.me/${e164}`;
}

/**
 * Telegram link that opens a chat with the account behind an E.164 number
 * (no "+" in the input). Telegram only resolves it when the owner's privacy
 * settings let people find them by number; otherwise it shows an error.
 */
export function telegramUrl(e164: string): string {
  return `https://t.me/+${e164}`;
}

/**
 * Masks the middle digits of a phone-number display string, keeping the
 * first `keepStart` and last `keepEnd` digits visible. Non-digit characters
 * (parentheses, spaces, hyphens, leading `+`) are preserved verbatim, so the
 * masked output keeps the same visual rhythm as the input.
 *
 * Examples (default keepStart=4, keepEnd=4):
 *   "(48) 98459-6882"  → "(48) 98•••-6882"
 *   "(11) 99887-6655"  → "(11) 99•••-6655"
 *   "+5548984596882"   → "+554•••••6882"
 *
 * Strings with fewer total digits than `keepStart + keepEnd` are returned
 * unchanged — there's nothing meaningful left to mask.
 */
export function maskPhoneDisplay(
  raw: string,
  options: { keepStart?: number; keepEnd?: number; maskChar?: string } = {},
): string {
  const { keepStart = 4, keepEnd = 4, maskChar = "•" } = options;
  const totalDigits = raw.replace(/\D/g, "").length;
  if (totalDigits <= keepStart + keepEnd) return raw;

  let seen = 0;
  let out = "";
  for (const ch of raw) {
    if (!/\d/.test(ch)) {
      out += ch;
      continue;
    }
    seen++;
    if (seen <= keepStart || seen > totalDigits - keepEnd) {
      out += ch;
    } else {
      out += maskChar;
    }
  }
  return out;
}
