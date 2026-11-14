import { describe, expect, test } from "bun:test";

import { submitPet } from "../actions";

/**
 * A picture the storage layer rejects (wrong type) before it writes anything.
 * It stands in for "the picture step": `invalid_picture_type` means validation
 * passed and the action went on to save the picture; any other error means it
 * stopped earlier, with nothing saved.
 */
const UNSAVEABLE_PICTURE = new File(["not an image"], "note.txt", { type: "text/plain" });

const VALID_FIELDS: Record<string, string> = {
  name: "Thor",
  gender: "male",
  species: "dog",
  birthdate: "2020-01-15",
  breed: "SRD",
  g0_name: "Maria",
  g0_email: "maria@example.com",
  g0_p0_phone: "(48) 98111-1111",
  g0_p0_call: "on",
  accept_terms: "on",
  accept_public: "on",
};

/** The valid form with `overrides` applied; a `null` value removes the field. */
function formWith(overrides: Record<string, string | null> = {}): FormData {
  const fields = { ...VALID_FIELDS, ...overrides };
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) form.append(key, value);
  }
  form.append("picture", UNSAVEABLE_PICTURE);
  return form;
}

const submit = (form: FormData) => submitPet("38q9uymz5c43", { status: "idle" }, form);

describe("submitPet consent", () => {
  test("a form with either box unticked is refused before anything else is processed", async () => {
    for (const field of ["accept_terms", "accept_public"]) {
      expect(await submit(formWith({ [field]: null }))).toEqual({
        status: "error",
        message: "consent_required",
      });
    }
  });

  test("it is refused even when the rest of the form is just as wrong: consent comes first", async () => {
    const result = await submit(formWith({ accept_terms: null, name: "", birthdate: "" }));
    expect(result).toEqual({ status: "error", message: "consent_required" });
  });

  test("anything but a ticked box does not count", async () => {
    for (const value of ["", "off", "false", "yes"]) {
      const result = await submit(formWith({ accept_public: value }));
      expect(result).toEqual({ status: "error", message: "consent_required" });
    }
  });
});

describe("submitPet validation", () => {
  test("a valid form gets as far as saving the picture", async () => {
    expect(await submit(formWith())).toEqual({ status: "error", message: "invalid_picture_type" });
  });

  test("a secondary guardian left completely empty is simply skipped", async () => {
    const result = await submit(formWith({ g1_name: "", g1_p0_phone: "" }));
    expect(result).toEqual({ status: "error", message: "invalid_picture_type" });
  });

  test("a secondary guardian with a phone but no name is an error, not silently dropped", async () => {
    const result = await submit(
      formWith({ g1_name: "", g1_p0_phone: "(11) 97777-7777", g1_p0_whatsapp: "on" }),
    );
    expect(result).toEqual({ status: "error", message: "missing_fields" });
  });

  test("a secondary guardian with a name but no phone is an error", async () => {
    const result = await submit(formWith({ g1_name: "João" }));
    expect(result).toEqual({ status: "error", message: "missing_fields" });
  });

  test("the primary guardian's e-mail is required, before the picture is saved", async () => {
    for (const email of [null, "", "   "]) {
      expect(await submit(formWith({ g0_email: email }))).toEqual({
        status: "error",
        message: "missing_fields",
      });
    }
  });

  test("an e-mail that isn't an address is rejected, whoever it belongs to", async () => {
    for (const bad of ["maria", "maria@", "maria@example", "ma ria@example.com", "@example.com"]) {
      expect(await submit(formWith({ g0_email: bad }))).toEqual({
        status: "error",
        message: "invalid_email",
      });
    }
    const secondary = await submit(
      formWith({ g1_name: "João", g1_p0_phone: "(11) 97777-7777", g1_p0_whatsapp: "on", g1_email: "joao" }),
    );
    expect(secondary).toEqual({ status: "error", message: "invalid_email" });
  });

  test("the secondary guardian's e-mail stays optional", async () => {
    const result = await submit(
      formWith({ g1_name: "João", g1_p0_phone: "(11) 97777-7777", g1_p0_whatsapp: "on", g1_email: "" }),
    );
    expect(result).toEqual({ status: "error", message: "invalid_picture_type" });
  });

  test("a number that can't be a Brazilian phone is rejected before the picture is saved", async () => {
    const result = await submit(formWith({ g0_p0_phone: "(48) 9811" }));
    expect(result).toEqual({ status: "error", message: "invalid_phone" });
  });

  test("a number with no way to reach it is rejected before the picture is saved", async () => {
    const result = await submit(formWith({ g0_p0_call: null }));
    expect(result).toEqual({ status: "error", message: "invalid_phone_channels" });
  });

  test("a missing species is rejected before the picture is saved", async () => {
    expect(await submit(formWith({ species: null }))).toEqual({
      status: "error",
      message: "missing_fields",
    });
  });

  test("an invalid weight is rejected before the picture is saved", async () => {
    expect(await submit(formWith({ weight: "-2" }))).toEqual({
      status: "error",
      message: "invalid_details",
    });
  });

  test("weight and neutered left empty are fine", async () => {
    expect(await submit(formWith({ weight: "", neutered: "" }))).toEqual({
      status: "error",
      message: "invalid_picture_type",
    });
  });

  test("breed is optional: a form without one gets as far as saving the picture", async () => {
    expect(await submit(formWith({ breed: null }))).toEqual({
      status: "error",
      message: "invalid_picture_type",
    });
    expect(await submit(formWith({ breed: "" }))).toEqual({
      status: "error",
      message: "invalid_picture_type",
    });
  });

  test("an over-long breed is rejected before the picture is saved", async () => {
    expect(await submit(formWith({ breed: "x".repeat(61) }))).toEqual({
      status: "error",
      message: "invalid_details",
    });
  });

  test("an over-long about text is rejected before the picture is saved", async () => {
    const result = await submit(formWith({ about: "x".repeat(501) }));
    expect(result).toEqual({ status: "error", message: "invalid_details" });
  });
});
