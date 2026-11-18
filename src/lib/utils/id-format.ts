/**
 * The shape of a hashId — pure (no nanoid), so edge code such as the
 * middleware can validate ids without pulling in the generator.
 */

/**
 * URL-safe alphabet without visually ambiguous characters
 * (no 0/O, 1/l/I, no vowels that could spell unintended words).
 * 32 chars total → exactly 5 bits per character.
 */
export const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/**
 * Length of the ids we generate: 10 × 5 bits = 50 bits of entropy (~10^15 IDs).
 *
 * Shorter than that buys nothing (the QR code, with the logo's error
 * correction, is the same size from 6 to 10 characters) and makes ids
 * guessable; longer makes the code denser.
 */
export const HASH_ID_LENGTH = 10;

/**
 * Every length an id can have, i.e. every length a tag may have been printed
 * with. A printed QR code never changes, so raising `HASH_ID_LENGTH` later
 * (say back to 12) must not invalidate the tags already out: keep each length
 * ever issued in this list, and only change what `generateHashId` produces.
 */
export const HASH_ID_LENGTHS: readonly number[] = [10, 12];

/** Shortest and longest id, for matchers that can only express a range (the middleware's). */
export const HASH_ID_MIN_LENGTH = Math.min(...HASH_ID_LENGTHS);
export const HASH_ID_MAX_LENGTH = Math.max(...HASH_ID_LENGTHS);

/** Regex source matching exactly one hashId, for route patterns (kept in sync with the alphabet/lengths above). */
export const HASH_ID_PATTERN = `(?:${HASH_ID_LENGTHS.map((n) => `[${ALPHABET}]{${n}}`).join("|")})`;

/** Loose validation — accepts only IDs from our alphabet at a length we have issued. */
export function isHashId(value: string): boolean {
  if (!HASH_ID_LENGTHS.includes(value.length)) return false;
  for (const char of value) {
    if (!ALPHABET.includes(char)) return false;
  }
  return true;
}
