import type { Pet } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { formatWeight } from "@/lib/utils/pet-details";

type PetDetailsProps = {
  pet: Pick<
    Pet,
    "name" | "species" | "breed" | "weightKg" | "neutered" | "allergies" | "about"
  >;
  locale: Locale;
};

/**
 * The "About {pet}" block: the quick facts (type, breed, weight, neutered) as
 * tiles, then allergies and the free-form "about". Every field is optional
 * (pets registered before they existed have none) and a tile is only drawn for
 * what is known, so the section is left out when there is nothing to show.
 *
 * `neutered === false` is an answer ("No"); `undefined` is not informed and
 * gets no tile.
 */
export function PetDetails({ pet, locale }: PetDetailsProps) {
  const dict = getDictionary(locale);
  const { species, breed, weightKg, neutered, allergies, about } = pet;
  const hasAllergies = !!allergies && allergies.length > 0;

  const facts: Array<{ label: string; value: string }> = [];
  // `dict.species[species]` is undefined for a kind stored by a newer build: no tile beats a blank one.
  const speciesName = species ? dict.species[species] : undefined;
  if (speciesName) facts.push({ label: dict.petSpecies, value: speciesName });
  if (breed) facts.push({ label: dict.petBreed, value: breed });
  if (weightKg !== undefined) {
    facts.push({ label: dict.petWeight, value: formatWeight(weightKg, locale) });
  }
  if (neutered !== undefined) {
    facts.push({ label: dict.petNeutered, value: neutered ? dict.neuteredYes : dict.neuteredNo });
  }

  if (facts.length === 0 && !hasAllergies && !about) return null;

  return (
    <section
      id="pet-details"
      aria-labelledby="pet-details-heading"
      className="rounded-card bg-surface"
    >
      <header className="mx-2 flex min-h-16 items-center border-b border-black/10 py-4 pb-3">
        <h2
          id="pet-details-heading"
          className="pl-2 text-lg font-bold tracking-tight text-ink"
        >
          {dict.aboutPet(pet.name)}
        </h2>
      </header>

      <dl className="space-y-5 px-4 py-5">
        {facts.length > 0 && (
          // Two tiles per row; a lone last one (odd count) takes the full row.
          <div className="grid grid-cols-2 gap-2">
            {facts.map(({ label, value }) => (
              <div
                key={label}
                className="min-w-0 rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/10 last:odd:col-span-2"
              >
                <dt className="text-xs font-medium text-muted">{label}</dt>
                <dd className="mt-0.5 break-words text-base font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </div>
        )}

        {hasAllergies && (
          <div>
            <dt className="text-xs font-medium text-muted">{dict.petAllergies}</dt>
            <dd className="mt-1.5">
              <ul className="flex flex-wrap gap-2">
                {allergies.map((allergy, i) => (
                  // The index is part of the key: stored data is not deduped
                  // (a hand-edited document or the JSON seed can repeat a value).
                  <li
                    key={`${allergy}-${i}`}
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
