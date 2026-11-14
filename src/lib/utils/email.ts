/** Longest address SMTP allows (RFC 5321). */
export const MAX_EMAIL_LENGTH = 254;

/**
 * A deliberately loose shape check — one `@`, something on both sides, a dot
 * in the domain, no spaces — not a deliverability test. It stops typos and
 * junk (the form's `type="email"` does the same client-side) without rejecting
 * valid but unusual addresses; the only real proof an address works is mail
 * reaching it.
 */
export function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
