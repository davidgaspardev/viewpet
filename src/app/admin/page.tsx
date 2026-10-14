import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { isAdminAuthorized } from "@/features/admin/auth";
import { resolveOrigin } from "@/features/admin/origin";
import { QrGenerator } from "@/features/admin/index.client";
import { PetRepositoryFactory } from "@/lib/repository";
import { SnackbarProvider } from "@/ui/Snackbar";
import { StickyHeader } from "@/ui/StickyHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · View Pet",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Middleware is the primary gate (it also sends the Basic-auth challenge).
  // Re-check here so the page never renders without credentials even if the
  // middleware is skipped (e.g. x-middleware-subrequest bypass on old Next).
  const requestHeaders = await headers();
  if (!(await isAdminAuthorized(requestHeaders.get("authorization")))) notFound();

  // The QR codes are rendered in the browser, so the origin is resolved (and
  // validated) here once. A bad SITE_URL blocks the list instead of printing
  // tags that can never resolve.
  const origin = resolveOrigin(process.env.SITE_URL, requestHeaders);
  const entries = origin ? await PetRepositoryFactory.getInstance().listPetEntries() : [];

  return (
    <>
      <StickyHeader />
      <main className="min-h-screen px-6 pb-32 pt-14">
        <header className="mt-8">
          <h1 className="text-xl font-bold text-ink">QR codes</h1>
          <p className="mt-1 text-xs text-muted">
            Every pet id and its status. Each new code reserves an id; scanning it opens the registration
            form until the pet is registered.
          </p>
        </header>
        <div className="mt-6">
          {origin ? (
            <SnackbarProvider closeLabel="Close" placement="left">
              <QrGenerator initialEntries={entries} origin={origin} />
            </SnackbarProvider>
          ) : (
            <p className="text-sm text-red-700">
              SITE_URL is not a valid http(s) URL. Fix the server configuration.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
