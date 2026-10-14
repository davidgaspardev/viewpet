/**
 * Normalise an env-provided base URL (`SITE_URL`, `QR_BASE_URL`).
 *
 * - `undefined` — unset or blank (the caller decides on a default)
 * - `null`      — set but not an absolute http(s) URL (a misconfiguration)
 * - `string`    — origin plus any path, without trailing slashes or query/hash
 */
export function parseBaseUrl(raw: string | undefined): string | null | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

/**
 * Like `parseBaseUrl`, but the value must be a bare origin (`https://qr.viewpet.info`):
 * a path, query or hash makes it `null`. Used for `QR_BASE_URL`, whose redirect
 * matches `/<id>` at the host root, so a path prefix could never be honoured.
 * Returns the hostname alongside the origin so callers need not parse it again.
 */
export function parseOriginParts(
  raw: string | undefined,
): { origin: string; hostname: string } | null | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const bare = url.pathname === "/" && !url.search && !url.hash;
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !bare) return null;
  return { origin: url.origin, hostname: url.hostname };
}

/** `parseOriginParts`, origin only: a string, `null` if invalid, `undefined` if unset. */
export function parseOrigin(raw: string | undefined): string | null | undefined {
  const parts = parseOriginParts(raw);
  return parts ? parts.origin : parts;
}
