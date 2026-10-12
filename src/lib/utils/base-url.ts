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
