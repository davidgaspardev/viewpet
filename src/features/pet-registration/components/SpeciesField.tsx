import { getDictionary, type Locale } from "@/lib/i18n";
import { isPetSpecies, PET_SPECIES, type PetSpecies } from "@/types/pet";

import { ChoiceGroup } from "./ChoiceGroup";

type SpeciesFieldProps = {
  locale: Locale;
  /** `undefined` until the tutor picks one. */
  value: PetSpecies | undefined;
  onValueChange: (species: PetSpecies) => void;
};

/**
 * Dog / cat (whatever `PET_SPECIES` lists), required. Submitted as `species`.
 * Controlled by the form: the breed field narrows its suggestions by it.
 */
export function SpeciesField({ locale, value, onValueChange }: SpeciesFieldProps) {
  const dict = getDictionary(locale);
  return (
    <ChoiceGroup
      legend={dict.petSpecies}
      name="species"
      required
      choices={PET_SPECIES.map((species) => ({ value: species, label: dict.species[species] }))}
      value={value ?? ""}
      onValueChange={(next) => {
        if (isPetSpecies(next)) onValueChange(next);
      }}
    />
  );
}
