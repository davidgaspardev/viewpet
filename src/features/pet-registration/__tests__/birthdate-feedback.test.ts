import { describe, expect, test } from "bun:test";
import { birthdateFeedback } from "../components/birthdateFeedback";

const TODAY = "2026-10-11";
const base = { today: TODAY, touched: false, focused: false, locale: "pt-BR" as const };

describe("birthdateFeedback", () => {
  test("empty text has no message and nothing to submit (required handles it)", () => {
    expect(birthdateFeedback("", { ...base, touched: true })).toEqual({
      iso: "",
      message: "",
      showError: false,
      echo: null,
    });
  });

  test("a valid date submits its ISO and echoes the date in words", () => {
    expect(birthdateFeedback("21/04/2018", base)).toEqual({
      iso: "2018-04-21",
      message: "",
      showError: false,
      echo: "21 de abril de 2018",
    });
    expect(birthdateFeedback("21/04/2018", { ...base, locale: "en-US" }).echo).toBe("April 21, 2018");
  });

  test("an incomplete date is not flagged while the user is still typing, even after a first blur", () => {
    expect(birthdateFeedback("21/04", { ...base, touched: false, focused: true }).showError).toBe(false);
    expect(birthdateFeedback("21/04", { ...base, touched: true, focused: true }).showError).toBe(false);
  });

  test("an incomplete date is flagged once the field was left", () => {
    const fb = birthdateFeedback("21/04", { ...base, touched: true, focused: false });
    expect(fb.showError).toBe(true);
    expect(fb.message).toBe("Digite a data completa (dia/mês/ano).");
    expect(fb.iso).toBe("");
  });

  test("a full but invalid date is flagged immediately, with a specific message", () => {
    const typing = { ...base, touched: false, focused: true };
    expect(birthdateFeedback("31/02/2020", typing)).toMatchObject({
      showError: true,
      message: "Data de nascimento inválida.",
      iso: "",
    });
    expect(birthdateFeedback("01/01/2099", typing).message).toBe("A data não pode estar no futuro.");
    expect(birthdateFeedback("01/01/1800", typing).message).toBe("Essa data é muito antiga. Confira o ano.");
  });

  test("messages follow the locale", () => {
    const fb = birthdateFeedback("01/01/2099", { ...base, locale: "en-US", focused: true });
    expect(fb.message).toBe("The date can't be in the future.");
  });
});
