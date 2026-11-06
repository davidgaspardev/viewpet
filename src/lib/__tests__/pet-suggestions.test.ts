import { describe, expect, test } from "bun:test";
import { SUPPORTED_LOCALES } from "../i18n";
import { getAllergySuggestions, getBreedSuggestions } from "../pet-suggestions";
import { MAX_ALLERGY_LENGTH, MAX_BREED_LENGTH } from "../utils/pet-details";

describe("pet suggestions", () => {
  for (const locale of SUPPORTED_LOCALES) {
    describe(locale, () => {
      test("breeds: no blanks, no duplicates, all fit the field limit", () => {
        const breeds = getBreedSuggestions(locale);
        expect(breeds.length).toBeGreaterThan(20);
        expect(breeds.every((b) => b.trim() === b && b.length > 0)).toBe(true);
        expect(breeds.every((b) => b.length <= MAX_BREED_LENGTH)).toBe(true);
        expect(new Set(breeds.map((b) => b.toLocaleLowerCase())).size).toBe(breeds.length);
      });

      test("allergies: no blanks, no duplicates, all fit the field limit", () => {
        const allergies = getAllergySuggestions(locale);
        expect(allergies.length).toBeGreaterThan(10);
        expect(allergies.every((a) => a.trim() === a && a.length > 0)).toBe(true);
        expect(allergies.every((a) => a.length <= MAX_ALLERGY_LENGTH)).toBe(true);
        expect(new Set(allergies.map((a) => a.toLocaleLowerCase())).size).toBe(allergies.length);
      });

      test("the rest of the breeds are alphabetical", () => {
        const [, ...rest] = getBreedSuggestions(locale);
        expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, locale)));
      });
    });
  }

  test("the mixed-breed option comes first, in each language", () => {
    expect(getBreedSuggestions("pt-BR")[0]).toBe("SRD (sem raça definida)");
    expect(getBreedSuggestions("en-US")[0]).toBe("Mixed breed");
  });

  test("names are localised where they differ", () => {
    expect(getBreedSuggestions("pt-BR")).toContain("Pastor Alemão");
    expect(getBreedSuggestions("en-US")).toContain("German Shepherd");
    expect(getAllergySuggestions("pt-BR")).toContain("Frango");
    expect(getAllergySuggestions("en-US")).toContain("Chicken");
  });
});
