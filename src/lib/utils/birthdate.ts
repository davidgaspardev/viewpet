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

/** Progressive `DD/MM/YYYY` mask: keeps digits only, inserts the slashes as you type. */
export function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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
