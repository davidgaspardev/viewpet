/**
 * Public origin encoded into the QR codes. Pure so it can be unit-tested:
 * "use server" modules may only export server actions.
 */

type HeaderReader = { get(name: string): string | null };

/** First entry of a possibly comma-separated forwarded header ("a.com, b.com"). */
function first(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

/**
 * Resolve the base URL (no trailing slash) printed on the tags.
 *
 * `siteUrl` (the `SITE_URL` env) wins when set, and must be an absolute
 * http(s) URL — a typo'd value returns `null` instead of silently producing
 * tags that can never resolve. Otherwise the origin is rebuilt from the
 * request's forwarded/host headers.
 */
export function resolveOrigin(siteUrl: string | undefined, headers: HeaderReader): string | null {
  const configured = siteUrl?.trim();
  if (configured) {
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  }

  const host = first(headers.get("x-forwarded-host")) ?? first(headers.get("host")) ?? "localhost:3000";
  const forwardedProto = first(headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : host.startsWith("localhost")
        ? "http"
        : "https";
  return `${proto}://${host}`;
}
