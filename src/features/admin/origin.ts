/**
 * Where the QR codes point. Pure so it can be unit-tested:
 * "use server" modules may only export server actions.
 */

import { parseBaseUrl, parseOrigin } from "@/lib/utils/base-url";
import { resolveOrigin, type HeaderReader } from "@/lib/utils/origin";
import { TAG_ROUTE } from "@/lib/utils/routes";

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

/** The URL a tag's QR code encodes: the base from `resolveQrBase` plus the id. */
export function qrUrl(base: string, id: string): string {
  return `${base}/${id}`;
}
