import { InfoCircleIcon } from "@/ui/icons";

import { HOW_IT_WORKS, SECTION_IDS } from "../content";
import { SectionHeading } from "./SectionHeading";

/** The three steps from a tag in hand to a finder on the phone, and what becomes public. */
export function HowItWorksSection() {
  return (
    <section
      id={SECTION_IDS.howItWorks}
      aria-labelledby="how-it-works-title"
      className="scroll-mt-16 bg-surface py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          id="how-it-works-title"
          eyebrow={HOW_IT_WORKS.eyebrow}
          title={HOW_IT_WORKS.title}
          align="center"
        />

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.steps.map((step, index) => (
            <li key={step.title} className="rounded-card bg-white p-6 shadow-pill">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-sage bg-[url(/noise-light.png)] text-base font-bold text-ink"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ink/75">{step.body}</p>
            </li>
          ))}
        </ol>

        <div
          role="note"
          className="mx-auto mt-8 flex max-w-3xl gap-3 rounded-card border border-sage/60 bg-sage/15 px-4 py-3 text-sm text-ink"
        >
          <InfoCircleIcon className="mt-0.5 h-5 w-5 flex-none" />
          <p>{HOW_IT_WORKS.notice}</p>
        </div>
      </div>
    </section>
  );
}
