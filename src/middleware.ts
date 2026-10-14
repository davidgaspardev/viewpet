import type { NextRequest } from "next/server";

import { guardAdmin } from "@/features/admin/guard";
import { handleQrRedirect } from "@/features/qr-redirect/handler";

/**
 * Next allows one middleware file, so this only dispatches; each concern lives
 * in its own module and they never run for the same request.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return guardAdmin(request);
  return handleQrRedirect(request);
}

export const config = {
  // The second entry is any single 12-character segment (HASH_ID_LENGTH). It is
  // deliberately wider than the id alphabet because the matcher must be a
  // literal: resolveQrRedirect() does the exact check (and lowercases the id).
  matcher: ["/admin/:path*", "/:id([A-Za-z0-9]{12})"],
};
