import { describe, expect, test } from "bun:test";
import {
  MAX_ABOUT_LENGTH,
  MAX_ALLERGIES,
  MAX_ALLERGY_LENGTH,
  MAX_BREED_LENGTH,
  collapseWhitespace,
  normalizeAbout,
  normalizeAllergies,
  normalizeBreed,
} from "../utils/pet-details";

describe("collapseWhitespace", () => {
  test("trims and collapses inner runs, including tabs and newlines", () => {
    expect(collapseWhitespace("  Shih \t  Tzu\n")).toBe("Shih Tzu");
  });
});

describe("normalizeBreed", () => {
  test("returns the cleaned breed", () => {
    expect(normalizeBreed("  Labrador   Retriever ")).toBe("Labrador Retriever");
  });

  test("blank is undefined", () => {
    expect(normalizeBreed("   ")).toBeUndefined();
  });

  test("accepts exactly the limit and rejects one over", () => {
    expect(normalizeBreed("a".repeat(MAX_BREED_LENGTH))).toBe("a".repeat(MAX_BREED_LENGTH));
    expect(normalizeBreed("a".repeat(MAX_BREED_LENGTH + 1))).toBeUndefined();
  });
});

describe("normalizeAllergies", () => {
  test("cleans entries and keeps their order", () => {
    expect(normalizeAllergies([" Frango ", "Pólen"])).toEqual({
      ok: true,
      allergies: ["Frango", "Pólen"],
    });
  });

  test("drops blanks", () => {
    expect(normalizeAllergies(["", "  ", "Soja"])).toEqual({ ok: true, allergies: ["Soja"] });
  });

  test("drops case-insensitive duplicates, keeping the first spelling", () => {
    expect(normalizeAllergies(["Frango", "frango", "FRANGO", "Ovo"])).toEqual({
      ok: true,
      allergies: ["Frango", "Ovo"],
    });
  });

  test("an empty list is fine", () => {
    expect(normalizeAllergies([])).toEqual({ ok: true, allergies: [] });
  });

  test("rejects an entry over the length limit", () => {
    expect(normalizeAllergies(["a".repeat(MAX_ALLERGY_LENGTH + 1)])).toEqual({ ok: false });
    expect(normalizeAllergies(["a".repeat(MAX_ALLERGY_LENGTH)]).ok).toBe(true);
  });

  test("rejects more entries than the limit, counting after dedupe", () => {
    const many = Array.from({ length: MAX_ALLERGIES + 1 }, (_, i) => `alergia ${i}`);
    expect(normalizeAllergies(many)).toEqual({ ok: false });
    expect(normalizeAllergies(many.slice(0, MAX_ALLERGIES)).ok).toBe(true);
    // Repeats don't count toward the limit.
    expect(normalizeAllergies([...many.slice(0, MAX_ALLERGIES), "ALERGIA 0"]).ok).toBe(true);
  });
});

describe("normalizeAbout", () => {
  test("empty means not provided", () => {
    expect(normalizeAbout("  \n ")).toEqual({ ok: true });
  });

  test("trims the ends but keeps inner spacing and line breaks", () => {
    expect(normalizeAbout("  Calmo.\n\nAdora  passear. ")).toEqual({
      ok: true,
      about: "Calmo.\n\nAdora  passear.",
    });
  });

  test("normalises Windows and old-Mac line endings", () => {
    expect(normalizeAbout("a\r\nb\rc")).toEqual({ ok: true, about: "a\nb\nc" });
  });

  test("accepts exactly the limit and rejects one over", () => {
    expect(normalizeAbout("a".repeat(MAX_ABOUT_LENGTH)).ok).toBe(true);
    expect(normalizeAbout("a".repeat(MAX_ABOUT_LENGTH + 1))).toEqual({ ok: false });
  });
});
