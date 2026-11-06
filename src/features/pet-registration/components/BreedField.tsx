"use client";

import { useMemo, useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { getBreedSuggestions } from "@/lib/pet-suggestions";
import { MAX_BREED_LENGTH } from "@/lib/utils/pet-details";

import { SuggestInput } from "./SuggestInput";

/** Free-text breed, with suggestions as the user types. Submitted as `breed`. */
export function BreedField({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const suggestions = useMemo(() => getBreedSuggestions(locale), [locale]);
  const [breed, setBreed] = useState("");

  return (
    <SuggestInput
      name="breed"
      label={dict.petBreed}
      labelSuffix={<span className="ml-1 text-red-500">*</span>}
      placeholder={dict.petBreedPlaceholder}
      value={breed}
      onValueChange={setBreed}
      suggestions={suggestions}
      maxLength={MAX_BREED_LENGTH}
      required
    />
  );
}
