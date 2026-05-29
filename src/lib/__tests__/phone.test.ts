/**
 * Tests for the phone-number masking utility.
 * Run with: bun test src/lib/__tests__/phone.test.ts
 */

import { describe, expect, test } from "bun:test";
import { maskPhoneDisplay } from "../utils/phone";

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
