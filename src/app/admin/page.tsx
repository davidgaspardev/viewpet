import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { isAdminAuthorized } from "@/features/admin/auth";
import { QrGenerator } from "@/features/admin/index.client";

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
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">QR code generator</h1>
        <p className="text-sm text-black/60">
          Each code reserves a new pet id. Scanning it opens the registration form for that pet.
        </p>
      </header>
      <QrGenerator />
    </main>
  );
}
