/**
 * The site's public origin, for building absolute URLs (QR codes, Open Graph
 * images). Pure so it can be unit-tested.
 */

import { parseBaseUrl } from "./base-url";

export type HeaderReader = { get(name: string): string | null };

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
 * request's forwarded/host headers.
 */
export function resolveOrigin(siteUrl: string | undefined, headers: HeaderReader): string | null {
  const configured = parseBaseUrl(siteUrl);
  if (configured !== undefined) return configured;

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
