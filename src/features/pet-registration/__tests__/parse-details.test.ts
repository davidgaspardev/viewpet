import { describe, expect, test } from "bun:test";
import {
  MAX_ABOUT_LENGTH,
  MAX_ALLERGIES,
  MAX_BREED_LENGTH,
  MAX_WEIGHT_KG,
} from "@/lib/utils/pet-details";
import { parsePetDetails } from "../parse-details";

function formOf(entries: Array<[string, string | File]>): FormData {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
}

describe("parsePetDetails", () => {
  test("species and breed are enough — allergies and about are left out", () => {
    expect(parsePetDetails(formOf([["species", "dog"], ["breed", "Shih Tzu"]]))).toEqual({
      ok: true,
      details: { species: "dog", breed: "Shih Tzu" },
    });
  });

  test("reads every field", () => {
    const form = formOf([
      ["species", "cat"],
      ["breed", "  Pastor   Alemão "],
      ["weight", " 4,5 "],
      ["neutered", "no"],
      ["allergies", "Frango"],
      ["allergies", "Pólen"],
      ["about", "  Calmo e dócil.\n"],
    ]);
    expect(parsePetDetails(form)).toEqual({
      ok: true,
      details: {
        species: "cat",
        breed: "Pastor Alemão",
        weightKg: 4.5,
        neutered: false,
        allergies: ["Frango", "Pólen"],
        about: "Calmo e dócil.",
      },
    });
  });

  test("cleans allergies: blanks and case-insensitive duplicates go", () => {
    const form = formOf([
      ["species", "dog"],
      ["breed", "SRD"],
      ["allergies", "Frango"],
      ["allergies", "  "],
      ["allergies", "FRANGO"],
    ]);
    expect(parsePetDetails(form)).toEqual({
      ok: true,
      details: { species: "dog", breed: "SRD", allergies: ["Frango"] },
    });
  });

  test("breed is optional: species alone is enough, and a blank breed is left out", () => {
    expect(parsePetDetails(formOf([["species", "cat"]]))).toEqual({
      ok: true,
      details: { species: "cat" },
    });
    expect(parsePetDetails(formOf([["species", "cat"], ["breed", "   "]]))).toEqual({
      ok: true,
      details: { species: "cat" },
    });
  });

  test("with no species there is nothing to publish: a missing field", () => {
    expect(parsePetDetails(formOf([]))).toEqual({ ok: false, error: "missing_fields" });
    expect(parsePetDetails(formOf([["breed", "SRD"]]))).toEqual({
      ok: false,
      error: "missing_fields",
    });
  });

  test("a file in a text field is ignored, not treated as a value", () => {
    const file = new File(["x"], "x.txt");
    expect(parsePetDetails(formOf([["species", "dog"], ["breed", file]]))).toEqual({
      ok: true,
      details: { species: "dog" },
    });
    const form = formOf([
      ["species", "dog"],
      ["breed", "SRD"],
      ["about", file],
    ]);
    expect(parsePetDetails(form)).toEqual({ ok: true, details: { species: "dog", breed: "SRD" } });
  });

  test("over-limit values are invalid details", () => {
    expect(parsePetDetails(formOf([["species", "dog"], ["breed", "a".repeat(MAX_BREED_LENGTH + 1)]]))).toEqual({
      ok: false,
      error: "invalid_details",
    });
    expect(
      parsePetDetails(
        formOf([["species", "dog"], ["breed", "SRD"], ["about", "a".repeat(MAX_ABOUT_LENGTH + 1)]]),
      ),
    ).toEqual({ ok: false, error: "invalid_details" });
    const tooMany: Array<[string, string]> = Array.from(
      { length: MAX_ALLERGIES + 1 },
      (_, i): [string, string] => ["allergies", `alergia ${i}`],
    );
    expect(parsePetDetails(formOf([["species", "dog"], ["breed", "SRD"], ...tooMany]))).toEqual({
      ok: false,
      error: "invalid_details",
    });
  });
});

describe("parsePetDetails: species, weight and neutered", () => {
  const base: Array<[string, string]> = [["species", "dog"], ["breed", "SRD"]];

  test("species is required: absent, blank or unknown is a missing field", () => {
    for (const species of [null, "", "dragon", "DOG"]) {
      const entries: Array<[string, string]> = [["breed", "SRD"]];
      if (species !== null) entries.push(["species", species]);
      expect(parsePetDetails(formOf(entries))).toEqual({ ok: false, error: "missing_fields" });
    }
  });

  test("weight and neutered are optional and left out when not given", () => {
    expect(parsePetDetails(formOf(base))).toEqual({
      ok: true,
      details: { species: "dog", breed: "SRD" },
    });
  });

  test("neutered: yes and no are answers; unsure (empty) and anything else is not informed", () => {
    const neutered = (value: string) => {
      const result = parsePetDetails(formOf([...base, ["neutered", value]]));
      if (!result.ok) throw new Error("expected ok");
      return result.details.neutered;
    };
    expect(neutered("yes")).toBe(true);
    // `false` is a real answer and must be kept, not dropped like a missing value.
    expect(neutered("no")).toBe(false);
    expect(neutered("")).toBeUndefined();
    expect(neutered("maybe")).toBeUndefined();
  });

  test("weight accepts a comma or a point and keeps the number", () => {
    for (const [typed, kg] of [["4,5", 4.5], ["4.5", 4.5], ["32", 32], ["0,25", 0.25]] as const) {
      expect(parsePetDetails(formOf([...base, ["weight", typed]]))).toMatchObject({
        ok: true,
        details: { weightKg: kg },
      });
    }
  });

  test("a weight that is zero, negative, over the limit or not a number is invalid details", () => {
    for (const typed of ["0", "-3", "abc", "4,5kg", "1.234,5", String(MAX_WEIGHT_KG + 1)]) {
      expect(parsePetDetails(formOf([...base, ["weight", typed]]))).toEqual({
        ok: false,
        error: "invalid_details",
      });
    }
  });
});
