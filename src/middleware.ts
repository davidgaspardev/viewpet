import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_REALM, isAdminAuthorized } from "@/features/admin/auth";

export async function middleware(request: NextRequest) {
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

export const config = {
  matcher: ["/admin/:path*"],
};
