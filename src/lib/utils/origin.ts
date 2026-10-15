/**
 * The site's public origin, for building absolute URLs (QR codes, Open Graph
 * images). Pure so it can be unit-tested.
 */

import { parseBaseUrl, parseOrigin } from "./base-url";

export type HeaderReader = { get(name: string): string | null };

/** `host` or `host:port` — a DNS name, IPv4 or bracketed IPv6, nothing else (no userinfo, path or spaces). */
const HOST = /^(?:[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?(?:\.[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

/** First entry of a possibly comma-separated forwarded header ("a.com, b.com"). */
function first(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

/**
 * Resolve the site's base URL (no trailing slash).
 *
 * `siteUrl` (the `SITE_URL` env) wins when set, and must be an absolute
 * http(s) URL — a typo'd value returns `null` instead of silently producing
 * tags that can never resolve. Otherwise the origin is rebuilt from the
 * request's forwarded/host headers; if those don't form a valid origin (a
 * malformed or hostile `X-Forwarded-Host`) the result is `null` too, never an
 * unparsable string. Header values are only as trustworthy as the proxy in
 * front of them, so production should set `SITE_URL`.
 */
export function resolveOrigin(siteUrl: string | undefined, headers: HeaderReader): string | null {
  const configured = parseBaseUrl(siteUrl);
  if (configured !== undefined) return configured;

  const host = first(headers.get("x-forwarded-host")) ?? first(headers.get("host")) ?? "localhost:3000";
  if (!HOST.test(host)) return null;

  const forwardedProto = first(headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : host.startsWith("localhost")
        ? "http"
        : "https";
  return parseOrigin(`${proto}://${host}`) ?? null;
}
