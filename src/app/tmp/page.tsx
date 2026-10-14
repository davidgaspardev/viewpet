import { notFound } from "next/navigation";
import Link from "next/link";

import { PetRepositoryFactory } from "@/lib/repository";
import { getDictionary } from "@/lib/i18n";
import { tagPath } from "@/lib/utils/routes";
import { resolveLocale } from "@/lib/i18n.server";
import { Logo } from "@/ui/Logo";

// Force dynamic rendering — every page render hits the database
export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [entries, locale] = await Promise.all([
    PetRepositoryFactory.getInstance().listPetEntries(),
    resolveLocale(),
  ]);
  const dict = getDictionary(locale);
  const badges = {
    reserved: { label: dict.statusReserved, className: "bg-amber-100 text-amber-800" },
    active: { label: dict.statusActive, className: "bg-ink/10 text-ink" },
    lost: { label: dict.statusLost, className: "bg-red-100 text-red-800" },
  } as const;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Logo className="h-20 w-20 text-muted" />

      <div>
        <h1 className="text-3xl font-bold text-ink">{dict.landingTitle}</h1>
        <p className="mt-2 text-muted">{dict.landingBody}</p>
      </div>

      <section className="w-full rounded-xl bg-surface px-6 py-5 text-left">
        <h2 className="text-sm font-semibold text-muted">{dict.tryExamples}</h2>
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => {
            const badge = badges[entry.status];
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3"
              >
                <Link
                  href={tagPath(entry.id)}
                  className="font-mono text-sm text-ink hover:underline"
                >
                  {tagPath(entry.id)}
                  {entry.name ? (
                    <span className="ml-2 font-sans text-xs text-muted">
                      ({entry.name})
                    </span>
                  ) : null}
                </Link>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                    badge.className
                  }
                >
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
