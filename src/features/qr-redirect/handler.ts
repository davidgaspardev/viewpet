import { NextResponse, type NextRequest } from "next/server";

import { hostnameOf, resolveQrRedirect } from "@/lib/utils/qr-redirect";
import { qrScanCookie } from "@/lib/utils/qr-scan";

/**
 * Short QR host: `<QR_BASE_URL>/<id>` → `<SITE_URL>/tag/<id>` (307), marking
 * the visit as a scan with the short-lived `qr_scan` cookie.
 *
 * Always returns a response and never throws: anything unexpected is logged and
 * the request carries on as if this host were not special (a normal 404 for
 * the QR host), so a bug here can't break the rest of the site.
 */
export function handleQrRedirect(
  request: NextRequest,
  env: Record<string, string | undefined> = process.env,
): NextResponse {
  try {
    const { pathname, search } = request.nextUrl;
    const hostname = hostnameOf(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));

    const destination = resolveQrRedirect({ hostname, pathname, search }, env);
    if (!destination) return NextResponse.next();

    const response = NextResponse.redirect(destination, 307);
    const cookie = qrScanCookie({ qrHostname: hostname, destination });
    if (cookie) response.cookies.set(cookie);
    return response;
  } catch (error) {
    console.error("[qr-redirect] failed, passing the request through:", error);
    return NextResponse.next();
  }
}
