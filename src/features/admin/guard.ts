import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_REALM, isAdminAuthorized } from "./auth";

/**
 * The /admin gate: HTTP Basic auth against `ADMIN_PASSWORD`. Kept apart from
 * the other middleware work (the QR redirect) so a bug in one can't take the
 * other down; it fails closed — if it throws, Next answers 500, never the page.
 */
export async function guardAdmin(request: NextRequest): Promise<NextResponse> {
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
