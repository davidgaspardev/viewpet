/**
 * Limits and normalisation for the free-text pet details (breed, allergies,
 * about). Pure, so the registration form (maxLength / counters) and the server
 * action (the real check) share one definition.
 */

export const MAX_BREED_LENGTH = 60;
export const MAX_ALLERGIES = 10;
export const MAX_ALLERGY_LENGTH = 40;
export const MAX_ABOUT_LENGTH = 500;
/** Heaviest weight accepted, in kg. Above the largest breeds, below a typo like 450. */
export const MAX_WEIGHT_KG = 150;

/** Trim and collapse internal whitespace runs ("  Shih   Tzu " → "Shih Tzu"). */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** A breed, or `undefined` when empty / over the limit. */
export function normalizeBreed(value: string): string | undefined {
  const breed = collapseWhitespace(value);
  if (!breed || breed.length > MAX_BREED_LENGTH) return undefined;
  return breed;
}

export type NormalizedAllergies =
  | { ok: true; allergies: string[] }
  | { ok: false };

/**
 * Cleans a list of allergy entries: collapses whitespace, drops blanks and
 * case-insensitive duplicates (first spelling wins), keeps the order.
 * `ok: false` when an entry or the list is over its limit — the form enforces
 * both, so this only trips on a tampered request.
 */
export function normalizeAllergies(values: readonly string[]): NormalizedAllergies {
  const seen = new Set<string>();
  const allergies: string[] = [];
  for (const raw of values) {
    const allergy = collapseWhitespace(raw);
    if (!allergy) continue;
    if (allergy.length > MAX_ALLERGY_LENGTH) return { ok: false };
    // Not `toLocaleLowerCase()`: under tr-TR "I" → "ı", so the key would depend on the runtime's locale.
    const key = allergy.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    allergies.push(allergy);
  }
  if (allergies.length > MAX_ALLERGIES) return { ok: false };
  return { ok: true, allergies };
}

export type NormalizedAbout = { ok: true; about?: string } | { ok: false };

/**
 * The "about" paragraph. Trims the ends and normalises line endings but keeps
 * line breaks and inner spacing — it is a paragraph, not a label. Empty means
 * "not provided" (`ok: true` without `about`); over the limit is `ok: false`.
 */
export function normalizeAbout(value: string): NormalizedAbout {
  const about = value.replace(/\r\n?/g, "\n").trim();
  if (!about) return { ok: true };
  if (about.length > MAX_ABOUT_LENGTH) return { ok: false };
  return { ok: true, about };
}

export type NormalizedWeight = { ok: true; weightKg?: number } | { ok: false };

/**
 * The weight in kg, typed as the tutor writes it: "4,5" (pt-BR) or "4.5", up
 * to two decimals, no thousands separators and no unit. Empty means "not
 * provided" (`ok: true` without `weightKg`); zero, negative, malformed or
 * above `MAX_WEIGHT_KG` is `ok: false`.
 */
export function normalizeWeight(value: string): NormalizedWeight {
  const text = value.trim();
  if (!text) return { ok: true };
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(text)) return { ok: false };
  const weightKg = Number(text.replace(",", "."));
  if (weightKg <= 0 || weightKg > MAX_WEIGHT_KG) return { ok: false };
  return { ok: true, weightKg };
}

/** "4,5 kg" / "4.5 kg": the weight in the reader's number format, up to two decimals. */
export function formatWeight(weightKg: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(weightKg)} kg`;
}

/** `neutered` as submitted by the form: "yes" / "no", anything else (unsure, absent) is not informed. */
export function parseNeutered(value: string): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}
