import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n.server";
import { Logo } from "@/ui/Logo";

export default async function NotFound() {
  const locale = await resolveLocale();
  const dict = getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo className="h-20 w-20 text-muted" />
      <div>
        <h1 className="text-2xl font-bold text-ink">{dict.notFoundTitle}</h1>
        <p className="mt-2 text-muted">{dict.notFoundBody}</p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-pill hover:bg-ink/90"
      >
        {dict.backHome}
      </Link>
    </main>
  );
}
