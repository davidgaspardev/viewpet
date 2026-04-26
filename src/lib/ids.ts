import { customAlphabet } from "nanoid";

/**
 * URL-safe alphabet without visually ambiguous characters
 * (no 0/O, 1/l/I, no vowels that could spell unintended words).
 * 32 chars total → exactly 5 bits per character.
 */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** ID length in characters. 12 × 5 bits = 60 bits of entropy (~10^18 IDs). */
export const HASH_ID_LENGTH = 12;

const generator = customAlphabet(ALPHABET, HASH_ID_LENGTH);

/** Generate a fresh opaque hashId for a pet record. */
export function generateHashId(): string {
  return generator();
}

/** Loose validation — accepts only IDs from our alphabet at the right length. */
export function isHashId(value: string): boolean {
  if (value.length !== HASH_ID_LENGTH) return false;
  for (const char of value) {
    if (!ALPHABET.includes(char)) return false;
  }
  return true;
}
