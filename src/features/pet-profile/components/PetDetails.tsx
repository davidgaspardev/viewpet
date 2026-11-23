import type { Pet } from "@/types/pet";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { formatAge, formatBirthMonth } from "@/lib/utils/age";
import { formatWeight } from "@/lib/utils/pet-details";

type PetDetailsProps = {
  pet: Pick<
    Pet,
    "name" | "species" | "breed" | "weightKg" | "neutered" | "allergies" | "about"
  > &
    /** Always there for a registered pet; optional here so the block also renders without one. */
    Partial<Pick<Pet, "birthdate" | "birthdateApproximate">>;
  locale: Locale;
};

/**
 * The "About {pet}" block: the age on a tile of its own (with the month and year
 * of birth, or "about N" and no month when the age was only an estimate), then the other quick facts (type, breed, weight, neutered) as
 * tiles, then allergies and the free-form "about". Every field is optional
 * (pets registered before they existed have none) and a tile is only drawn for
 * what is known, so the section is left out when there is nothing to show.
 *
 * `neutered === false` is an answer ("No"); `undefined` is not informed and
 * gets no tile.
 */
export function PetDetails({ pet, locale }: PetDetailsProps) {
  const dict = getDictionary(locale);
  const { species, breed, weightKg, neutered, allergies, about, birthdate, birthdateApproximate } = pet;
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

  // `born` is undefined for a value that isn't a date; then there is no age to show either.
  const born = birthdate ? formatBirthMonth(birthdate, locale) : undefined;
  const ageLabel = birthdate && born ? formatAge(birthdate, locale) : undefined;

  if (!ageLabel && facts.length === 0 && !hasAllergies && !about) return null;

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
        {(ageLabel || facts.length > 0) && (
          <div className="space-y-2">
            {ageLabel && born && (
              // The age gets the full row, first: a finder needs it (puppy or senior) before the rest.
              <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/10">
                <dt className="text-xs font-medium text-muted">{dict.petAge}</dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-ink">
                  {birthdateApproximate ? (
                    // An estimate: say so, and don't print a month of birth nobody stated.
                    <span>{dict.approxAge(ageLabel)}</span>
                  ) : (
                    <>
                      <span>{ageLabel}</span>
                      <span className="text-sm font-normal text-ink/70">
                        <span aria-hidden="true">· </span>
                        {dict.bornOn(born)}
                      </span>
                    </>
                  )}
                </dd>
              </div>
            )}

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
