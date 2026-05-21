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
