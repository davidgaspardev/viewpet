import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_REALM, isAdminAuthorized } from "@/features/admin/auth";
import { hostnameOf, resolveQrRedirect } from "@/lib/utils/qr-redirect";

/** The /admin gate: HTTP Basic auth against `ADMIN_PASSWORD`. */
async function guardAdmin(request: NextRequest) {
  if (await isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.next();
  }

  const configured = Boolean(process.env.ADMIN_PASSWORD);
  return new NextResponse(
    configured ? "Authentication required" : "Admin is disabled: ADMIN_PASSWORD is not set",
    {
      status: configured ? 401 : 503,
      headers: {
        "Cache-Control": "no-store",
        ...(configured && {
          "WWW-Authenticate": `Basic realm="${ADMIN_REALM}", charset="UTF-8"`,
        }),
      },
    },
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return guardAdmin(request);

  // Short QR host: <QR_BASE_URL>/<id> -> <SITE_URL>/tag/<id>, configured at runtime.
  const hostname = hostnameOf(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const destination = resolveQrRedirect({ hostname, pathname, search }, process.env);
  return destination ? NextResponse.redirect(destination, 307) : NextResponse.next();
}

export const config = {
  // The second entry is any single 12-character segment (HASH_ID_LENGTH). It is
  // deliberately wider than the id alphabet because the matcher must be a
  // literal: resolveQrRedirect() does the exact check (and lowercases the id).
  matcher: ["/admin/:path*", "/:id([A-Za-z0-9]{12})"],
};
