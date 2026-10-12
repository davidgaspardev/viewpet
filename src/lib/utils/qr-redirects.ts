import { parseBaseUrl } from "./base-url";
import { HASH_ID_PATTERN } from "./ids";
import { tagPath } from "./routes";

/** `process.env`-shaped: only `SITE_URL` and `QR_BASE_URL` are read. */
type QrRedirectEnv = Record<string, string | undefined>;

/** Shape of a Next.js `redirects()` entry (only the fields used here). */
export type QrRedirect = {
  source: string;
  has: { type: "host"; value: string }[];
  destination: string;
  permanent: false;
};

/**
 * Redirect for the short QR host: `<QR_BASE_URL>/<id>` → `<SITE_URL>/tag/<id>`.
 *
 * Imported by next.config.ts, so it runs at build time and needs the env vars
 * then. Returns nothing when either variable is unset or invalid (local dev,
 * where the QR points straight at the page). The redirect is temporary (307)
 * on purpose: this host is the indirection layer for printed tags, so its
 * destination must stay changeable without browsers or CDNs remembering it.
 * Only well-formed ids match; anything else falls through to a normal 404.
 */
export function buildQrRedirects(env: QrRedirectEnv): QrRedirect[] {
  const qrBase = parseBaseUrl(env.QR_BASE_URL);
  const site = parseBaseUrl(env.SITE_URL);
  if (!qrBase || !site) return [];

  const { hostname, pathname } = new URL(qrBase);
  return [
    {
      source: `${pathname.replace(/\/+$/, "")}/:id(${HASH_ID_PATTERN})`,
      has: [{ type: "host", value: hostname }],
      destination: `${site}${tagPath(":id")}`,
      permanent: false,
    },
  ];
}
