import { describe, expect, test } from "bun:test";

import { getDictionary } from "@/lib/i18n";
import { formatBirthMonth } from "@/lib/utils/age";
import { MAX_AGE_MONTHS } from "@/lib/utils/birthdate";

import { ageFeedback } from "../components/ageFeedback";

const TODAY = "2026-10-11";
const base = { today: TODAY, touched: false, focused: false, locale: "pt-BR" as const };

describe("ageFeedback", () => {
  test("both fields blank is 'not informed': nothing to submit, nothing to complain about", () => {
    expect(ageFeedback("", "", { ...base, touched: true })).toEqual({
      iso: "",
      message: "",
      showError: false,
      echo: null,
    });
  });

  test("months alone: 33 months", () => {
    const fb = ageFeedback("", "33", base);
    expect(fb.iso).toBe("2024-01-08");
    expect(fb.message).toBe("");
    expect(fb.showError).toBe(false);
  });

  test("years alone: a blank month counts as 0", () => {
    expect(ageFeedback("2", "", base).iso).toBe("2024-10-08");
  });

  test("years and months add up: 2 years and 4 months", () => {
    expect(ageFeedback("2", "4", base).iso).toBe("2024-06-08");
    expect(ageFeedback("2", "4", base).iso).toBe(ageFeedback("", "28", base).iso);
    expect(ageFeedback("0", "28", base).iso).toBe(ageFeedback("", "28", base).iso);
  });

  test("echoes the approximate birth month so the tutor sees what is recorded", () => {
    // 2026-10-11 − 28 months − 3 days = 2024-06-08. Expected text built from the
    // same formatter, so it doesn't depend on the runtime's ICU month names.
    for (const locale of ["pt-BR", "en-US"] as const) {
      const month = formatBirthMonth("2024-06-08", locale) as string;
      expect(ageFeedback("2", "4", { ...base, locale }).echo).toBe(getDictionary(locale).petAgeEcho(month));
    }
    expect(ageFeedback("2", "4", base).echo).toContain("2024");
  });

  test("zero is too young, but only flagged once the user has left the fields", () => {
    const typing = ageFeedback("0", "", { ...base, focused: true });
    expect(typing).toMatchObject({ iso: "", showError: false });
    expect(typing.message).toBe("Informe pelo menos 1 mês de vida. Para filhotes mais novos, use a data.");

    expect(ageFeedback("0", "0", { ...base, touched: true, focused: false })).toMatchObject({
      iso: "",
      showError: true,
    });
    // Touched, but back in a field (moving from years to months): still not shouting.
    expect(ageFeedback("0", "", { ...base, touched: true, focused: true }).showError).toBe(false);
  });

  test("too old is flagged at once, nothing is submitted", () => {
    const fb = ageFeedback("", String(MAX_AGE_MONTHS + 1), { ...base, focused: true });
    expect(fb).toMatchObject({
      iso: "",
      showError: true,
      message: "Essa idade é alta demais. Confira os valores.",
    });
    // 99 years is the ceiling; one month over is too old, whichever field it is typed in.
    expect(ageFeedback("99", "", base).iso).not.toBe("");
    expect(ageFeedback("99", "1", { ...base, focused: true })).toMatchObject({ iso: "", showError: true });
  });

  test("anything that isn't digits is invalid (the inputs strip it, this is the backstop)", () => {
    expect(ageFeedback("2a", "", base)).toMatchObject({ iso: "", showError: true, message: "Idade inválida." });
    expect(ageFeedback("", "-3", base).iso).toBe("");
  });

  test("messages follow the locale", () => {
    expect(ageFeedback("0", "0", { ...base, touched: true, locale: "en-US" }).message).toBe(
      "Enter at least 1 month. For younger pets, use the date.",
    );
  });
});
