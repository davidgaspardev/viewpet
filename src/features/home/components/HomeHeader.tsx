import Link from "next/link";

import { ArrowRightIcon } from "@/ui/icons";
import { Logo } from "@/ui/Logo";

import { NAV_LINKS } from "../content";

/** Fixed top bar: brand, the page's sections from `md` up, and the example link when there is one. */
export function HomeHeader({ demoHref }: { demoHref?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-black/5 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span aria-hidden="true">
            <Logo className="h-9 w-9 text-ink" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">ViewPet</span>
        </Link>

        <nav aria-label="Seções da página" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/75 transition hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {demoHref ? (
          <Link
            href={demoHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink/40 hover:bg-ink/5"
          >
            Ver exemplo
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className="w-9 md:hidden" />
        )}
      </div>
    </header>
  );
}
