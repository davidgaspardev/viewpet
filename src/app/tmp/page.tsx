import { notFound } from "next/navigation";
import Link from "next/link";

import { listPetEntries } from "@/lib/repository";
import { getDictionary } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n.server";
import { Logo } from "@/ui/Logo";

// Force dynamic rendering — every page render hits the database
export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [entries, locale] = await Promise.all([
    listPetEntries(),
    resolveLocale(),
  ]);
  const dict = getDictionary(locale);

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
            const isFilled = entry.status === "filled";
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3"
              >
                <Link
                  href={`/view/${entry.id}`}
                  className="font-mono text-sm text-ink hover:underline"
                >
                  /view/{entry.id}
                  {isFilled && entry.name ? (
                    <span className="ml-2 font-sans text-xs text-muted">
                      ({entry.name})
                    </span>
                  ) : null}
                </Link>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                    (isFilled
                      ? "bg-ink/10 text-ink"
                      : "bg-amber-100 text-amber-800")
                  }
                >
                  {isFilled ? dict.statusFilled : dict.statusEmpty}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
