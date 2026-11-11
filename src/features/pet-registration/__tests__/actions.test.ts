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
  birthdate: "2020-01-15",
  breed: "SRD",
  g0_name: "Maria",
  g0_p0_phone: "(48) 98111-1111",
  g0_p0_call: "on",
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

  test("a number that can't be a Brazilian phone is rejected before the picture is saved", async () => {
    const result = await submit(formWith({ g0_p0_phone: "(48) 9811" }));
    expect(result).toEqual({ status: "error", message: "invalid_phone" });
  });

  test("a number with no way to reach it is rejected before the picture is saved", async () => {
    const result = await submit(formWith({ g0_p0_call: null }));
    expect(result).toEqual({ status: "error", message: "invalid_phone_channels" });
  });

  test("a missing breed is rejected before the picture is saved", async () => {
    expect(await submit(formWith({ breed: null }))).toEqual({
      status: "error",
      message: "missing_fields",
    });
  });

  test("an over-long about text is rejected before the picture is saved", async () => {
    const result = await submit(formWith({ about: "x".repeat(501) }));
    expect(result).toEqual({ status: "error", message: "invalid_details" });
  });
});
