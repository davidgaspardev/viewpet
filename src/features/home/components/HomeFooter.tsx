import { Logo } from "@/ui/Logo";

import { FOOTER, NAV_LINKS } from "../content";

export function HomeFooter() {
  return (
    <footer className="border-t border-black/5 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span aria-hidden="true">
            <Logo className="h-9 w-9 text-ink" />
          </span>
          <div>
            <p className="text-base font-bold tracking-tight text-ink">ViewPet</p>
            <p className="text-sm text-ink/70">{FOOTER.tagline}</p>
          </div>
        </div>

        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2">
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
      </div>
      <p className="mx-auto mt-6 max-w-6xl px-6 text-xs text-ink/60">
        © {new Date().getFullYear()} ViewPet
      </p>
    </footer>
  );
}
