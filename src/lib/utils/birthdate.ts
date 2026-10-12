/**
 * Birthdate helpers shared by the registration form (typed, masked input) and
 * the server action (strict re-validation of the ISO value the form submits).
 *
 * Dates travel as `YYYY-MM-DD` strings; comparisons are lexicographic, which is
 * correct for zero-padded ISO dates.
 */

/** Oldest age (in years) accepted as a pet's birthdate — a typo guard, not a biology claim. */
export const MAX_PET_AGE_YEARS = 100;

export type BirthdateError = "incomplete" | "invalid" | "future" | "too_old";

export type BirthdateResult = { ok: true; iso: string } | { ok: false; error: BirthdateError };

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

const GROUP_LENGTHS = [2, 2, 4] as const;
const isDigit = (ch: string) => ch >= "0" && ch <= "9";

/**
 * Progressive `DD/MM/YYYY` mask for typing and pasting.
 *
 * - Digits fill day, month, year in order; slashes are inserted for you and
 *   extra digits are dropped.
 * - A separator (any non-digit: `/`, `-`, `.`, space) typed after a lone
 *   non-zero digit pads it, so `5/4/2018` becomes `05/04/2018`.
 * - A complete ISO date (`2018-04-21`, e.g. pasted) is reordered to `21/04/2018`.
 *
 * Idempotent: re-masking its own output returns it unchanged.
 */
export function applyDateMask(value: string): string {
  const iso = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(value);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const groups = [""];
  for (const ch of value) {
    let i = groups.length - 1;
    if (isDigit(ch)) {
      if (groups[i].length === GROUP_LENGTHS[i]) {
        if (i === GROUP_LENGTHS.length - 1) continue; // year is full: drop extra digits
        groups.push("");
        i++;
      }
      groups[i] += ch;
    } else if (i < GROUP_LENGTHS.length - 1 && groups[i] !== "" && groups[i] !== "0") {
      // Separator: close this group, zero-padding a lone digit ("5/" -> "05").
      groups[i] = groups[i].padStart(GROUP_LENGTHS[i], "0");
      groups.push("");
    }
  }
  return groups.filter(Boolean).join("/");
}

/**
 * Where to put the caret after `raw` (with the caret at `caret`) was re-masked
 * into `masked`: just after the same number of digits as before, so editing in
 * the middle of the field doesn't throw the caret to the end.
 */
export function caretAfterMask(raw: string, caret: number, masked: string): number {
  if (caret >= raw.length) return masked.length;

  const digitsBefore = [...raw.slice(0, caret)].filter(isDigit).length;
  if (digitsBefore === 0) return 0;

  let seen = 0;
  for (let i = 0; i < masked.length; i++) {
    if (isDigit(masked[i]) && ++seen === digitsBefore) return i + 1;
  }
  return masked.length;
}

/** Today in the *local* timezone as `YYYY-MM-DD` (what the user means by "today"). */
export function localTodayIso(now = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Tomorrow in UTC as `YYYY-MM-DD`. The server uses it as the upper bound so a
 * user whose local "today" is already ahead of the server's UTC date (e.g.
 * east of UTC) isn't told that today is in the future.
 */
export function tomorrowUtcIso(now = new Date()): string {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Validate a calendar date. `latest` is the inclusive upper bound (`YYYY-MM-DD`);
 * the lower bound is `MAX_PET_AGE_YEARS` before its year.
 */
export function validateBirthdate(
  day: number,
  month: number,
  year: number,
  latest: string,
): BirthdateResult {
  if (![day, month, year].every(Number.isInteger)) return { ok: false, error: "invalid" };

  // Round-trip through Date to reject 31/02, 29/02 on non-leap years, month 13, …
  // (setUTCFullYear, because Date.UTC maps years 0–99 to 1900–1999.)
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  const isRealDate =
    year >= 1 &&
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day;
  if (!isRealDate) return { ok: false, error: "invalid" };

  const iso = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
  if (iso > latest) return { ok: false, error: "future" };
  if (year < Number(latest.slice(0, 4)) - MAX_PET_AGE_YEARS) return { ok: false, error: "too_old" };
  return { ok: true, iso };
}

/** Validate what the user typed in the masked field (`DD/MM/YYYY`). */
export function parseMaskedBirthdate(masked: string, latest: string): BirthdateResult {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked);
  if (!match) return { ok: false, error: "incomplete" };
  return validateBirthdate(Number(match[1]), Number(match[2]), Number(match[3]), latest);
}

/** Strict server-side check of the submitted `YYYY-MM-DD` value. */
export function validateBirthdateIso(iso: string, latest: string): BirthdateResult {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return { ok: false, error: "invalid" };
  return validateBirthdate(Number(match[3]), Number(match[2]), Number(match[1]), latest);
}

/** `YYYY-MM-DD` in words for `locale` ("21 de abril de 2018" / "April 21, 2018"). */
export function formatBirthdateLong(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
