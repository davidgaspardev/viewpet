import { describe, expect, test } from "bun:test";

import { isValidEmail, MAX_EMAIL_LENGTH } from "../utils/email";

describe("isValidEmail", () => {
  test("accepts ordinary and unusual-but-valid addresses", () => {
    for (const email of [
      "maria@example.com",
      "nome.sobrenome+pet@sub.example.com.br",
      "a@b.co",
      "o'brien@example.org",
    ]) {
      expect(isValidEmail(email)).toBe(true);
    }
  });

  test("rejects what is plainly not an address", () => {
    for (const email of ["", "maria", "maria@", "@example.com", "maria@example", "ma ria@example.com", "a@@b.com"]) {
      expect(isValidEmail(email)).toBe(false);
    }
  });

  test("accepts exactly the limit and rejects one over", () => {
    const at = (length: number) => `${"a".repeat(length - "@b.co".length)}@b.co`;
    expect(isValidEmail(at(MAX_EMAIL_LENGTH))).toBe(true);
    expect(isValidEmail(at(MAX_EMAIL_LENGTH + 1))).toBe(false);
  });
});
