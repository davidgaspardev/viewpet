import { PET_PAGE, SECTION_IDS } from "../content";
import { SectionHeading } from "./SectionHeading";

/** What the public pet page holds, one card per thing the app really does. */
export function PetPageSection() {
  return (
    <section
      id={SECTION_IDS.petPage}
      aria-labelledby="pet-page-title"
      className="scroll-mt-16 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          id="pet-page-title"
          eyebrow={PET_PAGE.eyebrow}
          title={PET_PAGE.title}
          lead={PET_PAGE.lead}
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PET_PAGE.features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-card bg-surface bg-[url(/noise-light.png)] p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage bg-[url(/noise-light.png)]">
                <Icon className="h-5 w-5 text-ink" />
              </span>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">{title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ink/75">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
