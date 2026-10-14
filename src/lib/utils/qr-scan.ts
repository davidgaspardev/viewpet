/**
 * The "this visit came from scanning the QR code" signal.
 *
 * The short QR host answers its redirect with a short-lived cookie; the pet
 * page reads it on the server. A redirect carries nothing else the page could
 * see (the browser's `Referer` is the page the scan started from, never the QR
 * host), and the cookie keeps the signal out of the URL, so a shared link
 * can't pass as a scan.
 */

export const QR_SCAN_COOKIE = "qr_scan";

/** How long a scan stays "fresh" — enough to cover the redirect and the page load. */
export const QR_SCAN_TTL_SECONDS = 60;

export type ScanSource = "qr" | "direct";

/** `qr` when the cookie value says so, `direct` otherwise (no cookie, or anything else). */
export function scanSourceFrom(cookieValue: string | undefined): ScanSource {
  return cookieValue === "1" ? "qr" : "direct";
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * The parent domain two hostnames share, e.g. `qr.viewpet.info` and
 * `viewpet.info` → `viewpet.info`; `undefined` when there is none worth using
 * (different domains, a single shared label like `localhost` or `com`, IPs).
 *
 * A cookie set by the QR host is host-only unless it names a `Domain`; the
 * pet page lives on a different host, so the cookie needs the shared parent.
 * Public suffixes such as `com.br` can't be told apart here; browsers reject
 * those cookies, which just means no scan signal.
 */
export function sharedCookieDomain(hostA: string, hostB: string): string | undefined {
  const a = hostA.toLowerCase();
  const b = hostB.toLowerCase();
  if (!a || !b || a.startsWith("[") || b.startsWith("[") || IPV4.test(a) || IPV4.test(b)) return undefined;

  const partsA = a.split(".").reverse();
  const partsB = b.split(".").reverse();
  const common: string[] = [];
  for (let i = 0; i < Math.min(partsA.length, partsB.length) && partsA[i] === partsB[i]; i++) {
    common.push(partsA[i]);
  }
  return common.length >= 2 ? common.reverse().join(".") : undefined;
}

export type QrScanCookie = {
  name: typeof QR_SCAN_COOKIE;
  value: "1";
  domain: string;
  /** The tag page only: the cookie is not sent for any other URL. */
  path: string;
  maxAge: number;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
};

/**
 * The cookie to set on the redirect to `destination` (the absolute pet-page
 * URL), or `null` when the QR host and the site share no parent domain, since
 * the page could never receive it.
 */
export function qrScanCookie(input: { qrHostname: string; destination: string }): QrScanCookie | null {
  const target = new URL(input.destination);
  const domain = sharedCookieDomain(input.qrHostname, target.hostname);
  if (!domain) return null;

  return {
    name: QR_SCAN_COOKIE,
    value: "1",
    domain,
    path: target.pathname,
    maxAge: QR_SCAN_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: target.protocol === "https:",
  };
}
