/**
 * Phone-number utilities for the public profile.
 *
 * The pet's profile page is consented public exposure of the guardian's
 * contact, but that doesn't mean we have to make scraping trivial. The
 * display string is masked so a screenshot or casual HTML view doesn't leak
 * the full number — the action buttons (`tel:` / `wa.me/`) still target the
 * real e164 so a real human tapping them gets through with no extra steps.
 *
 * Scraping the raw HTML can still recover the e164 from the `href` of the
 * action buttons. Masking the visible text is a first layer, not a complete
 * defense — for deeper protection, the next step is obfuscating the `href`
 * via a small client-side reveal handler.
 */

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
