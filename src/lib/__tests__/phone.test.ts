/**
 * Tests for the phone-number masking utility.
 * Run with: bun test src/lib/__tests__/phone.test.ts
 */

import { describe, expect, test } from "bun:test";
import {
  SELECTABLE_PHONE_CHANNELS,
  applyPhoneMask,
  isPlausibleBrazilPhone,
  maskPhoneDisplay,
  phoneInputProblem,
  telUrl,
  telegramUrl,
  toE164Brazil,
  whatsappUrl,
} from "../utils/phone";

describe("maskPhoneDisplay", () => {
  test("masks the middle digits of a Brazilian mobile display string", () => {
    expect(maskPhoneDisplay("(48) 98459-6882")).toBe("(48) 98•••-6882");
  });

  test("masks the middle digits of a Brazilian mobile without hyphen", () => {
    expect(maskPhoneDisplay("(48) 984596882")).toBe("(48) 98•••6882");
  });

  test("masks an e164-formatted number with leading +", () => {
    expect(maskPhoneDisplay("+5548984596882")).toBe("+5548•••••6882");
  });

  test("preserves non-digit characters verbatim", () => {
    const input = "(11) 99887-6655";
    const masked = maskPhoneDisplay(input);
    expect(masked).toContain("(");
    expect(masked).toContain(")");
    expect(masked).toContain(" ");
    expect(masked).toContain("-");
  });

  test("returns the input unchanged when there's nothing meaningful to mask", () => {
    // Total digits <= keepStart (4) + keepEnd (4).
    expect(maskPhoneDisplay("(11) 1234")).toBe("(11) 1234");
    expect(maskPhoneDisplay("12345678")).toBe("12345678");
  });

  test("respects custom keepStart / keepEnd options", () => {
    expect(
      maskPhoneDisplay("(48) 98459-6882", { keepStart: 2, keepEnd: 2 }),
    ).toBe("(48) •••••-••82");
  });

  test("respects a custom mask character", () => {
    expect(maskPhoneDisplay("(48) 98459-6882", { maskChar: "*" })).toBe(
      "(48) 98***-6882",
    );
  });

  test("preserves the total visible length so the masked string keeps the same rhythm", () => {
    const input = "(48) 98459-6882";
    expect(maskPhoneDisplay(input).length).toBe(input.length);
  });
});

describe("applyPhoneMask", () => {
  test("builds the mask as digits are typed", () => {
    expect(applyPhoneMask("4")).toBe("(4");
    expect(applyPhoneMask("48")).toBe("(48");
    expect(applyPhoneMask("489")).toBe("(48) 9");
    // Until the 11th digit it can't tell a mobile from a landline, so the
    // dash sits after four digits and moves once the number is complete.
    expect(applyPhoneMask("48981234")).toBe("(48) 9812-34");
  });

  test("11 digits are a mobile: (DD) 9XXXX-XXXX", () => {
    expect(applyPhoneMask("48981234567")).toBe("(48) 98123-4567");
  });

  test("10 digits are a landline: (DD) XXXX-XXXX", () => {
    expect(applyPhoneMask("4833334444")).toBe("(48) 3333-4444");
  });

  test("ignores non-digits and clears when empty", () => {
    expect(applyPhoneMask("(48) 98123-4567")).toBe("(48) 98123-4567");
    expect(applyPhoneMask("abc")).toBe("");
    expect(applyPhoneMask("")).toBe("");
  });

  test("drops digits past 11", () => {
    expect(applyPhoneMask("489812345678")).toBe("(48) 98123-4567");
  });

  test("a pasted international number loses its country code instead of its last digits", () => {
    // Without this, 13 digits were cut to "55489811111" and stored as the wrong number.
    expect(applyPhoneMask("+55 48 98111-1111")).toBe("(48) 98111-1111");
    expect(applyPhoneMask("5548981111111")).toBe("(48) 98111-1111");
    expect(applyPhoneMask("+55 48 3333-4444")).toBe("(48) 3333-4444");
  });

  test("a national number that merely starts with 55 (DDD 55) is left alone", () => {
    expect(applyPhoneMask("55981234567")).toBe("(55) 98123-4567");
    expect(applyPhoneMask("(55) 98123-4567")).toBe("(55) 98123-4567");
  });

  test("a pasted number round-trips to the right E.164", () => {
    for (const pasted of ["+55 48 98111-1111", "5548981111111", "(48) 98111-1111", "48981111111"]) {
      expect(toE164Brazil(applyPhoneMask(pasted))).toBe("5548981111111");
    }
  });
});

describe("toE164Brazil", () => {
  test("adds the 55 country code to a national number", () => {
    expect(toE164Brazil("(48) 98123-4567")).toBe("5548981234567");
    expect(toE164Brazil("4833334444")).toBe("554833334444");
  });

  test("keeps a number that already carries 55", () => {
    expect(toE164Brazil("+55 48 98123-4567")).toBe("5548981234567");
  });

  test("does not mistake a DDD 55 (Rio Grande do Sul) for the country code", () => {
    // 11 digits starting with 55 is DDD 55 + 9 digits, not a full E.164.
    expect(toE164Brazil("(55) 98123-4567")).toBe("5555981234567");
  });
});

describe("isPlausibleBrazilPhone", () => {
  test("accepts DDD plus 8 or 9 digits, with or without the country code", () => {
    expect(isPlausibleBrazilPhone("(48) 98123-4567")).toBe(true);
    expect(isPlausibleBrazilPhone("(48) 3333-4444")).toBe(true);
    expect(isPlausibleBrazilPhone("+55 48 98123-4567")).toBe(true);
    expect(isPlausibleBrazilPhone("554833334444")).toBe(true);
  });

  test("rejects numbers cut short, too long, or without digits", () => {
    expect(isPlausibleBrazilPhone("(48) 9")).toBe(false);
    expect(isPlausibleBrazilPhone("(48) 9812-34")).toBe(false);
    expect(isPlausibleBrazilPhone("98123-4567")).toBe(false); // no DDD
    expect(isPlausibleBrazilPhone("489812345678")).toBe(false); // 12 digits, not 55-prefixed
    expect(isPlausibleBrazilPhone("abc")).toBe(false);
    expect(isPlausibleBrazilPhone("")).toBe(false);
  });
});

describe("phoneInputProblem", () => {
  test("a blank number is no problem, whatever is ticked — the row is ignored", () => {
    expect(phoneInputProblem("", false)).toBeNull();
    expect(phoneInputProblem("   ", true)).toBeNull();
  });

  test("a short number is incomplete, even with a channel ticked", () => {
    expect(phoneInputProblem("(48) 9812", true)).toBe("incomplete");
  });

  test("a complete number with nothing ticked has no channel", () => {
    expect(phoneInputProblem("(48) 98123-4567", false)).toBe("no_channel");
  });

  test("a complete number with a channel is fine", () => {
    expect(phoneInputProblem("(48) 98123-4567", true)).toBeNull();
  });

  test("an incomplete number is reported before the missing channel", () => {
    expect(phoneInputProblem("(48) 9", false)).toBe("incomplete");
  });
});

describe("contact links", () => {
  test("each channel points at the E.164 number", () => {
    expect(telUrl("5548981234567")).toBe("tel:+5548981234567");
    expect(whatsappUrl("5548981234567")).toBe("https://wa.me/5548981234567");
    expect(telegramUrl("5548981234567")).toBe("https://t.me/+5548981234567");
  });

  test("the form offers call, WhatsApp and Telegram, in that order", () => {
    expect([...SELECTABLE_PHONE_CHANNELS]).toEqual(["call", "whatsapp", "telegram"]);
  });
});
