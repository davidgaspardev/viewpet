import { describe, expect, test } from "bun:test";
import { MAX_ABOUT_LENGTH, MAX_ALLERGIES, MAX_BREED_LENGTH } from "@/lib/utils/pet-details";
import { parsePetDetails } from "../parse-details";

function formOf(entries: Array<[string, string | File]>): FormData {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
}

describe("parsePetDetails", () => {
  test("breed alone is enough — allergies and about are left out", () => {
    expect(parsePetDetails(formOf([["breed", "Shih Tzu"]]))).toEqual({
      ok: true,
      details: { breed: "Shih Tzu" },
    });
  });

  test("reads every field", () => {
    const form = formOf([
      ["breed", "  Pastor   Alemão "],
      ["allergies", "Frango"],
      ["allergies", "Pólen"],
      ["about", "  Calmo e dócil.\n"],
    ]);
    expect(parsePetDetails(form)).toEqual({
      ok: true,
      details: { breed: "Pastor Alemão", allergies: ["Frango", "Pólen"], about: "Calmo e dócil." },
    });
  });

  test("cleans allergies: blanks and case-insensitive duplicates go", () => {
    const form = formOf([
      ["breed", "SRD"],
      ["allergies", "Frango"],
      ["allergies", "  "],
      ["allergies", "FRANGO"],
    ]);
    expect(parsePetDetails(form)).toEqual({
      ok: true,
      details: { breed: "SRD", allergies: ["Frango"] },
    });
  });

  test("a missing or blank breed is a missing field", () => {
    expect(parsePetDetails(formOf([]))).toEqual({ ok: false, error: "missing_fields" });
    expect(parsePetDetails(formOf([["breed", "   "]]))).toEqual({
      ok: false,
      error: "missing_fields",
    });
  });

  test("a file in a text field is ignored, not treated as a value", () => {
    const file = new File(["x"], "x.txt");
    expect(parsePetDetails(formOf([["breed", file]]))).toEqual({
      ok: false,
      error: "missing_fields",
    });
    const form = formOf([
      ["breed", "SRD"],
      ["about", file],
    ]);
    expect(parsePetDetails(form)).toEqual({ ok: true, details: { breed: "SRD" } });
  });

  test("over-limit values are invalid details", () => {
    expect(parsePetDetails(formOf([["breed", "a".repeat(MAX_BREED_LENGTH + 1)]]))).toEqual({
      ok: false,
      error: "invalid_details",
    });
    expect(
      parsePetDetails(formOf([["breed", "SRD"], ["about", "a".repeat(MAX_ABOUT_LENGTH + 1)]])),
    ).toEqual({ ok: false, error: "invalid_details" });
    const tooMany: Array<[string, string]> = Array.from(
      { length: MAX_ALLERGIES + 1 },
      (_, i): [string, string] => ["allergies", `alergia ${i}`],
    );
    expect(parsePetDetails(formOf([["breed", "SRD"], ...tooMany]))).toEqual({
      ok: false,
      error: "invalid_details",
    });
  });
});
