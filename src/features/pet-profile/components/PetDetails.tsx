import type { Pet } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

type PetDetailsProps = {
  pet: Pick<Pet, "name" | "breed" | "allergies" | "about">;
  locale: Locale;
};

/**
 * Breed, allergies and the free-form "about" of a pet. Every field is
 * optional (pets registered before they existed have none), and the whole
 * section is left out when there is nothing to show.
 */
export function PetDetails({ pet, locale }: PetDetailsProps) {
  const dict = getDictionary(locale);
  const { breed, allergies, about } = pet;
  const hasAllergies = !!allergies && allergies.length > 0;
  if (!breed && !hasAllergies && !about) return null;

  return (
    <section
      id="pet-details"
      aria-labelledby="pet-details-heading"
      className="rounded-xl bg-surface"
    >
      <header className="mx-2 flex h-16 items-center border-b border-black/10 py-4 pb-3">
        <h2
          id="pet-details-heading"
          className="pl-2 text-lg font-bold tracking-tight text-ink"
        >
          {dict.aboutPet(pet.name)}
        </h2>
      </header>

      <dl className="space-y-5 px-4 py-5">
        {breed && (
          <div>
            <dt className="text-xs font-medium text-muted">{dict.petBreed}</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">{breed}</dd>
          </div>
        )}

        {hasAllergies && (
          <div>
            <dt className="text-xs font-medium text-muted">{dict.petAllergies}</dt>
            <dd className="mt-1.5">
              <ul className="flex flex-wrap gap-2">
                {allergies.map((allergy) => (
                  <li
                    key={allergy}
                    className="rounded-full bg-white px-3 py-1 text-sm text-ink ring-1 ring-black/10"
                  >
                    {allergy}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        {about && (
          <div>
            <dt className="sr-only">{dict.petAbout}</dt>
            {/* Line breaks the guardian typed are kept; long unbroken text wraps. */}
            <dd className="whitespace-pre-line break-words text-base text-ink">{about}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
