import type { Metadata } from "next";

import { QrGenerator } from "@/features/admin/index.client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · View Pet",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
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
