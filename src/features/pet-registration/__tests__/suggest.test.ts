import { describe, expect, test } from "bun:test";
import {
  MAX_VISIBLE_SUGGESTIONS,
  filterSuggestions,
  normalizeForSearch,
} from "../components/suggest";

const BREEDS = ["SRD (sem raça definida)", "Beagle", "Bulldog Francês", "Maltês", "Pastor Alemão", "Shih Tzu"];

describe("normalizeForSearch", () => {
  test("lower-cases and strips accents", () => {
    expect(normalizeForSearch("  Maltês ")).toBe("maltes");
    expect(normalizeForSearch("PÓLEN")).toBe("polen");
  });
});

describe("filterSuggestions", () => {
  test("an empty query matches nothing — the list opens once the user types", () => {
    expect(filterSuggestions("", BREEDS)).toEqual([]);
    expect(filterSuggestions("   ", BREEDS)).toEqual([]);
  });

  test("matches ignoring case and accents", () => {
    expect(filterSuggestions("MALTES", BREEDS)).toEqual(["Maltês"]);
    expect(filterSuggestions("frances", BREEDS)).toEqual(["Bulldog Francês"]);
  });

  test("ranks prefix matches, then word-start matches, then the rest", () => {
    const list = ["Cocker Spaniel", "Shar-pei", "Pastor Alemão", "Spitz", "Basset Hound"];
    // "s" starts Shar-pei and Spitz, starts a word in "Cocker Spaniel", and is
    // only inside the words of "Pastor Alemão" and "Basset Hound".
    expect(filterSuggestions("s", list)).toEqual([
      "Shar-pei",
      "Spitz",
      "Cocker Spaniel",
      "Pastor Alemão",
      "Basset Hound",
    ]);
  });

  test("treats the text after '(' and '-' as the start of a word", () => {
    expect(filterSuggestions("sem", BREEDS)).toEqual(["SRD (sem raça definida)"]);
    expect(filterSuggestions("pei", ["Shar-pei", "Peixe"])).toEqual(["Peixe", "Shar-pei"]);
  });

  test("ties keep the input order", () => {
    expect(filterSuggestions("b", ["Boxer", "Beagle", "Basset Hound"])).toEqual([
      "Boxer",
      "Beagle",
      "Basset Hound",
    ]);
  });

  test("leaves out excluded entries, compared ignoring case and accents", () => {
    expect(filterSuggestions("mal", BREEDS, { exclude: ["MALTES"] })).toEqual([]);
    expect(filterSuggestions("b", BREEDS, { exclude: ["Beagle"] })).toEqual(["Bulldog Francês"]);
  });

  test("caps the list at the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Raça ${i}`);
    expect(filterSuggestions("raça", many)).toHaveLength(MAX_VISIBLE_SUGGESTIONS);
    expect(filterSuggestions("raça", many, { limit: 3 })).toHaveLength(3);
  });

  test("no match is an empty list", () => {
    expect(filterSuggestions("xyz", BREEDS)).toEqual([]);
  });
});
