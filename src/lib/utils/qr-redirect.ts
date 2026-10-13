import { parseBaseUrl, parseOrigin } from "./base-url";
import { isHashId } from "./id-format";
import { tagPath } from "./routes";

/** `process.env`-shaped: only `SITE_URL` and `QR_BASE_URL` are read. */
type QrRedirectEnv = Record<string, string | undefined>;

/** Hostname (no port, lowercase) from a `Host` / `X-Forwarded-Host` value; first entry of a list. */
export function hostnameOf(hostHeader: string | null | undefined): string {
  const first = hostHeader?.split(",")[0]?.trim().toLowerCase() ?? "";
  // "[::1]:3000" → "[::1]"; "qr.viewpet.info:443" → "qr.viewpet.info"
  return first.startsWith("[") ? first.replace(/\]:\d+$/, "]") : first.replace(/:\d+$/, "");
}

/**
 * Where a request to the short QR host should go, or `null` when it isn't one.
 *
 * `<QR_BASE_URL>/<id>` → `<SITE_URL>/tag/<id>`. Read from the environment on
 * every call (the middleware runs this per request), so changing either
 * variable takes effect without a rebuild. The id is lowercased, so a scanner
 * or a person typing capitals still lands on the page, and a trailing slash is
 * tolerated. Only well-formed ids match; the query string is kept.
 *
 * The middleware that calls this answers with a temporary (307) redirect on
 * purpose: this host is the indirection layer for printed tags, so its
 * destination must stay changeable without browsers or CDNs remembering it.
 */
export function resolveQrRedirect(
  request: { hostname: string; pathname: string; search: string },
  env: QrRedirectEnv,
): string | null {
  const qrBase = parseOrigin(env.QR_BASE_URL);
  const site = parseBaseUrl(env.SITE_URL);
  if (!qrBase || !site) return null;

  if (request.hostname !== new URL(qrBase).hostname) return null;

  const id = request.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!isHashId(id)) return null;

  return `${site}${tagPath(id)}${request.search}`;
}
