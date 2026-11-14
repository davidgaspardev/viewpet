import Link from "next/link";

import { ArrowDownIcon, ArrowRightIcon, CheckIcon } from "@/ui/icons";

import { EXAMPLE_TAG_ID, HERO, SECTION_IDS } from "../content";
import { PhoneMockup } from "./PhoneMockup";
import { TagIllustration } from "./TagIllustration";

const BUTTON_BASE = "inline-flex min-h-12 items-center gap-2 rounded-full text-base font-semibold transition";
const PRIMARY_BUTTON = `${BUTTON_BASE} px-6 bg-ink bg-[url(/noise-light.png)] text-white shadow-pill hover:bg-ink/90`;

/**
 * Opening section. The tag and the phone are laid out at their full size and
 * scaled down together on narrow screens instead of being redrawn for each
 * width.
 */
export function Hero({ demoHref }: { demoHref?: string }) {
  const howHref = `#${SECTION_IDS.howItWorks}`;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-gradient-to-b from-surface to-white pb-16 pt-28 sm:pt-32 lg:pb-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-28 h-72 w-72 rounded-full bg-sage/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-accent/80 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-ink/80">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sage" />
            {HERO.eyebrow}
          </p>

          <h1
            id="hero-title"
            className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            {HERO.title}
            <br />
            <span className="box-decoration-clone bg-gradient-to-t from-sage/60 from-[36%] to-transparent to-[36%]">
              {HERO.highlight}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">{HERO.lead}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            {demoHref ? (
              <>
                <Link href={demoHref} className={PRIMARY_BUTTON}>
                  {HERO.demoCta}
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <a href={howHref} className={`${BUTTON_BASE} px-1 text-ink/80 hover:text-ink`}>
                  {HERO.howCta}
                  <ArrowDownIcon className="h-5 w-5" />
                </a>
              </>
            ) : (
              <a href={howHref} className={PRIMARY_BUTTON}>
                {HERO.howCta}
                <ArrowDownIcon className="h-5 w-5" />
              </a>
            )}
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink/80">
            {HERO.reassurance.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-sage"
                >
                  <CheckIcon className="h-3 w-3 text-ink" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/*
          The tag and the phone are one picture, laid out at its full size (29rem by 30rem) and scaled
          down as a whole on narrow screens, so they keep their place relative to each other. The outer
          box has the scaled size, because a scale does not change the space an element takes.
        */}
        <div className="relative mx-auto h-[21rem] w-[20.3rem] sm:h-[30rem] sm:w-[29rem]">
          <div className="absolute left-0 top-0 h-[30rem] w-[29rem] origin-top-left scale-[0.7] sm:scale-100">
            {/* Both are centred on the same line: the tag hangs in front of the phone's left edge. */}
            <div className="absolute left-0 top-1/2 z-10 w-[15rem] -translate-y-1/2">
              <TagIllustration tagId={EXAMPLE_TAG_ID} swing />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 rotate-[3deg]">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
