/**
 * Where the QR codes point. Pure so it can be unit-tested:
 * "use server" modules may only export server actions.
 */

import { parseBaseUrl, parseOrigin } from "@/lib/utils/base-url";
import { TAG_ROUTE } from "@/lib/utils/routes";

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

export type QrBaseResult =
  | { ok: true; base: string }
  | { ok: false; error: "invalid_qr_base_url" | "invalid_site_url" };

/**
 * The URL prefix every QR code is printed with: a QR code encodes `${base}/${id}`.
 *
 * `QR_BASE_URL` (the short redirecting host, e.g. https://qr.viewpet.info) wins
 * when set; otherwise the QR points straight at the page, `<origin>/tag`, so
 * local dev works without the extra host. A set-but-invalid value is an error,
 * never silently ignored: printed tags can't be fixed afterwards.
 *
 * The short host only works if it redirects somewhere, and that redirect
 * (see `resolveQrRedirect`) needs a valid `SITE_URL`. So with `QR_BASE_URL` set,
 * `SITE_URL` is required too — otherwise we'd print QR codes that can't resolve.
 */
export function resolveQrBase(
  env: Record<string, string | undefined>, // process.env-shaped: reads SITE_URL and QR_BASE_URL
  headers: HeaderReader,
): QrBaseResult {
  const qrBase = parseOrigin(env.QR_BASE_URL);
  if (qrBase === null) return { ok: false, error: "invalid_qr_base_url" };
  if (qrBase) {
    if (!parseBaseUrl(env.SITE_URL)) return { ok: false, error: "invalid_site_url" };
    return { ok: true, base: qrBase };
  }

  const origin = resolveOrigin(env.SITE_URL, headers);
  if (!origin) return { ok: false, error: "invalid_site_url" };
  return { ok: true, base: `${origin}${TAG_ROUTE}` };
}
