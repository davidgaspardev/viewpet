import { CheckIcon } from "@/ui/icons";

import { EXAMPLE_TAG_ID, SECTION_IDS, TAG } from "../content";
import { SectionHeading } from "./SectionHeading";
import { TagIllustration } from "./TagIllustration";

/** The physical product: what it is made of and what the QR Code does. */
export function TagSection() {
  return (
    <section
      id={SECTION_IDS.tag}
      aria-labelledby="tag-title"
      className="scroll-mt-16 bg-surface py-20 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading id="tag-title" eyebrow={TAG.eyebrow} title={TAG.title} lead={TAG.lead} />

          <ul className="mt-8 space-y-5">
            {TAG.traits.map((trait) => (
              <li key={trait.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sage"
                >
                  <CheckIcon className="h-4 w-4 text-ink" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">{trait.title}</h3>
                  <p className="mt-0.5 text-base leading-relaxed text-ink/75">{trait.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-sage/30 to-accent/60 px-6 py-12">
          <TagIllustration tagId={EXAMPLE_TAG_ID} className="mx-auto" />
        </div>
      </div>
    </section>
  );
}
