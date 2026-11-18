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
  // The second entry is any single segment of 10 to 12 characters (the shortest
  // and longest HASH_ID_LENGTHS). It is deliberately wider than the id alphabet
  // and than the set of lengths because the matcher must be a literal:
  // resolveQrRedirect() does the exact check (and lowercases the id).
  matcher: ["/admin/:path*", "/:id([A-Za-z0-9]{10,12})"],
};
