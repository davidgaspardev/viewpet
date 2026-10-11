/**
 * Admin access control — HTTP Basic auth against a single shared password
 * held in the `ADMIN_PASSWORD` env var. There are no user accounts and no
 * login screen: the browser's native prompt collects the password.
 *
 * Imported by the edge middleware (guards `/admin/**`) and by the admin
 * server actions (defence in depth), so it only uses Web APIs.
 */

/** Realm shown in the browser's credentials prompt. */
export const ADMIN_REALM = "ViewPet Admin";

/** Constant-time string comparison (compares SHA-256 digests, so lengths don't leak). */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/**
 * True when `authorization` is a Basic header whose password matches
 * `ADMIN_PASSWORD`. The username is ignored. Fails closed: when the env
 * var is unset or empty nobody is authorised.
 */
export async function isAdminAuthorized(authorization: string | null): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !authorization) return false;

  const encoded = /^Basic +(\S+)$/i.exec(authorization)?.[1];
  if (!encoded) return false;

  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  return safeEqual(decoded.slice(separator + 1), expected);
}
