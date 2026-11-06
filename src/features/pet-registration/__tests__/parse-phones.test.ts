import { describe, expect, test } from "bun:test";
import { MAX_PHONES_PER_GUARDIAN } from "@/lib/utils/phone";
import { parsePhones } from "../parse-phones";

function formOf(entries: Array<[string, string | File]>): FormData {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
}

describe("parsePhones", () => {
  test("one number with its channels", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98123-4567"],
      ["g0_p0_call", "on"],
      ["g0_p0_whatsapp", "on"],
    ]);
    expect(parsePhones(form, "g0_")).toEqual({
      ok: true,
      phones: [{ e164: "5548981234567", display: "(48) 98123-4567", channels: ["call", "whatsapp"] }],
    });
  });

  test("Telegram is a channel like the others, and channels come out in form order", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98123-4567"],
      ["g0_p0_telegram", "on"],
      ["g0_p0_call", "on"],
    ]);
    const result = parsePhones(form, "g0_");
    expect(result.ok && result.phones[0].channels).toEqual(["call", "telegram"]);
  });

  test("several numbers keep their order — the first is the primary — each with its own channels", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "on"],
      ["g0_p1_phone", "(48) 98222-2222"],
      ["g0_p1_whatsapp", "on"],
      ["g0_p1_telegram", "on"],
      ["g0_p2_phone", "(48) 3333-4444"],
      ["g0_p2_call", "on"],
    ]);
    const result = parsePhones(form, "g0_");
    expect(result).toEqual({
      ok: true,
      phones: [
        { e164: "5548981111111", display: "(48) 98111-1111", channels: ["call"] },
        { e164: "5548982222222", display: "(48) 98222-2222", channels: ["whatsapp", "telegram"] },
        { e164: "554833334444", display: "(48) 3333-4444", channels: ["call"] },
      ],
    });
  });

  test("only reads the rows of the guardian it is asked about", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "on"],
      ["g1_p0_phone", "(11) 97777-7777"],
      ["g1_p0_whatsapp", "on"],
    ]);
    const second = parsePhones(form, "g1_");
    expect(second.ok && second.phones.map((p) => p.e164)).toEqual(["5511977777777"]);
  });

  test("a blank extra row is ignored, even though its checkboxes are ticked by default", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "on"],
      ["g0_p1_phone", "   "],
      ["g0_p1_call", "on"],
      ["g0_p1_whatsapp", "on"],
    ]);
    const result = parsePhones(form, "g0_");
    expect(result.ok && result.phones).toHaveLength(1);
  });

  test("a blank row in the middle does not hide a number after it", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "on"],
      ["g0_p1_phone", ""],
      ["g0_p2_phone", "(48) 98222-2222"],
      ["g0_p2_call", "on"],
    ]);
    const result = parsePhones(form, "g0_");
    expect(result.ok && result.phones.map((p) => p.e164)).toEqual(["5548981111111", "5548982222222"]);
  });

  test("a number with no channel ticked is an error — nobody could reach it", () => {
    expect(parsePhones(formOf([["g0_p0_phone", "(48) 98111-1111"]]), "g0_")).toEqual({
      ok: false,
      error: "invalid_phone_channels",
    });
    const second = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "on"],
      ["g0_p1_phone", "(48) 98222-2222"],
    ]);
    expect(parsePhones(second, "g0_")).toEqual({ ok: false, error: "invalid_phone_channels" });
  });

  test("a number that can't be a phone is invalid, whatever its channels", () => {
    for (const bad of ["abc", "---", "(48) 9", "(48) 9812-34", "98123-4567"]) {
      const form = formOf([
        ["g0_p0_phone", bad],
        ["g0_p0_call", "on"],
      ]);
      expect(parsePhones(form, "g0_")).toEqual({ ok: false, error: "invalid_phone" });
    }
  });

  test("garbage in an extra row fails the guardian instead of being merged into one dead number", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "on"],
      ["g0_p1_phone", "abc"],
      ["g0_p1_call", "on"],
      ["g0_p2_phone", "---"],
      ["g0_p2_whatsapp", "on"],
    ]);
    expect(parsePhones(form, "g0_")).toEqual({ ok: false, error: "invalid_phone" });
  });

  test("a pasted international number is accepted and normalised", () => {
    const form = formOf([
      ["g0_p0_phone", "+55 48 98111-1111"],
      ["g0_p0_call", "on"],
    ]);
    const result = parsePhones(form, "g0_");
    expect(result.ok && result.phones[0].e164).toBe("5548981111111");
  });

  test("a checkbox value other than \"on\" does not count", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "off"],
    ]);
    expect(parsePhones(form, "g0_")).toEqual({ ok: false, error: "invalid_phone_channels" });
  });

  test("no number at all is a missing field", () => {
    expect(parsePhones(formOf([]), "g0_")).toEqual({ ok: false, error: "missing_fields" });
    expect(parsePhones(formOf([["g0_p0_call", "on"]]), "g0_")).toEqual({
      ok: false,
      error: "missing_fields",
    });
  });

  test("the same number in two rows is kept once, in its first position, with both rows' channels", () => {
    const form = formOf([
      ["g0_p0_phone", "(48) 98111-1111"],
      ["g0_p0_call", "on"],
      ["g0_p1_phone", "(48) 98222-2222"],
      ["g0_p1_whatsapp", "on"],
      ["g0_p2_phone", "48981111111"], // same as the first, typed differently
      ["g0_p2_telegram", "on"],
      ["g0_p2_call", "on"],
    ]);
    const result = parsePhones(form, "g0_");
    expect(result).toEqual({
      ok: true,
      phones: [
        { e164: "5548981111111", display: "(48) 98111-1111", channels: ["call", "telegram"] },
        { e164: "5548982222222", display: "(48) 98222-2222", channels: ["whatsapp"] },
      ],
    });
  });

  test("rows past the limit are not read", () => {
    const entries: Array<[string, string]> = [];
    for (let row = 0; row <= MAX_PHONES_PER_GUARDIAN; row++) {
      entries.push([`g0_p${row}_phone`, `(48) 98${row}00-0000`], [`g0_p${row}_call`, "on"]);
    }
    const result = parsePhones(formOf(entries), "g0_");
    expect(result.ok && result.phones).toHaveLength(MAX_PHONES_PER_GUARDIAN);
  });

  test("a file in a text field is ignored", () => {
    const form = formOf([["g0_p0_phone", new File(["x"], "x.txt")]]);
    expect(parsePhones(form, "g0_")).toEqual({ ok: false, error: "missing_fields" });
  });
});
