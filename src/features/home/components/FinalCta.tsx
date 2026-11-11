import Link from "next/link";

import { ArrowRightIcon } from "@/ui/icons";

import { FINAL_CTA } from "../content";

/** Closing band. It exists only to send people to the example page, so it is left out without one. */
export function FinalCta({ demoHref }: { demoHref?: string }) {
  if (!demoHref) return null;

  return (
    <section
      aria-labelledby="final-cta-title"
      className="bg-ink bg-[url(/noise-light.png)] py-20 text-center text-white"
    >
      <div className="mx-auto max-w-2xl px-6">
        <h2 id="final-cta-title" className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {FINAL_CTA.title}
        </h2>
        <p className="mt-4 text-lg text-white/80">{FINAL_CTA.lead}</p>
        <Link
          href={demoHref}
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-base font-semibold text-ink transition hover:bg-white/90"
        >
          {FINAL_CTA.cta}
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
