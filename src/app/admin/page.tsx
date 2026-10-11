import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { isAdminAuthorized } from "@/features/admin/auth";
import { QrGenerator } from "@/features/admin/index.client";
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
  if (!(await isAdminAuthorized((await headers()).get("authorization")))) notFound();

  return (
    <>
      <StickyHeader />
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-14">
        <header className="mt-8">
          <h1 className="text-xl font-bold text-ink">QR code generator</h1>
          <p className="mt-1 text-xs text-muted">
            Each code reserves a new pet id. Scanning it opens the registration form for that pet.
          </p>
        </header>
        <div className="mt-6">
          <QrGenerator />
        </div>
      </main>
    </>
  );
}
