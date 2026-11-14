"use client";

import { useMemo, useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { getBreedSuggestions } from "@/lib/pet-suggestions";
import { MAX_BREED_LENGTH } from "@/lib/utils/pet-details";
import type { PetSpecies } from "@/types/pet";

import { OptionalTag } from "./FieldMarks";
import { SuggestInput } from "./SuggestInput";

type BreedFieldProps = {
  locale: Locale;
  /** The kind picked in the species field; narrows the suggestions to its breeds. */
  species?: PetSpecies;
};

/**
 * Optional free-text breed, with suggestions as the user types — the dog
 * breeds for a dog, the cat breeds for a cat. Submitted as `breed`.
 */
export function BreedField({ locale, species }: BreedFieldProps) {
  const dict = getDictionary(locale);
  const suggestions = useMemo(() => getBreedSuggestions(locale, species), [locale, species]);
  const [breed, setBreed] = useState("");

  return (
    <SuggestInput
      name="breed"
      label={dict.petBreed}
      labelSuffix={<OptionalTag label={dict.optional} />}
      hint={dict.petBreedHint}
      placeholder={dict.petBreedPlaceholder}
      value={breed}
      onValueChange={setBreed}
      suggestions={suggestions}
      maxLength={MAX_BREED_LENGTH}
    />
  );
}
