import { getDictionary, type Locale } from "@/lib/i18n";

/**
 * Compute the age in whole years between birthdate and reference date.
 * Falls back to months for pets younger than 1 year.
 */
export function ageInYears(birthdate: Date, now: Date = new Date()): number {
  let years = now.getFullYear() - birthdate.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthdate.getMonth() ||
    (now.getMonth() === birthdate.getMonth() && now.getDate() >= birthdate.getDate());
  if (!hasHadBirthdayThisYear) years -= 1;
  return Math.max(0, years);
}

export function ageInMonths(birthdate: Date, now: Date = new Date()): number {
  let months =
    (now.getFullYear() - birthdate.getFullYear()) * 12 +
    (now.getMonth() - birthdate.getMonth());
  if (now.getDate() < birthdate.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Localized human-readable age label, e.g. "8 anos" / "8 years old".
 */
export function formatAge(
  birthdate: string | Date,
  locale: Locale,
  now: Date = new Date(),
): string {
  const dict = getDictionary(locale);
  const date = typeof birthdate === "string" ? new Date(birthdate) : birthdate;
  const years = ageInYears(date, now);
  if (years >= 1) return dict.yearsOld(years);
  const months = ageInMonths(date, now);
  return dict.monthsOld(Math.max(1, months));
}

/**
 * Month and year of a birthdate, in the reader's language ("abr. de 2022" /
 * "Apr 2022"), or `undefined` for a value that isn't a date. Read in UTC:
 * birthdates are stored as UTC midnight of the day the tutor typed, so a
 * viewer west of UTC would otherwise see the previous day, and for a pet born
 * on the 1st, the previous month.
 */
export function formatBirthMonth(birthdate: string | Date, locale: Locale): string | undefined {
  const date = typeof birthdate === "string" ? new Date(birthdate) : birthdate;
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
