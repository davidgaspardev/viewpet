/**
 * Test file to verify locale normalization and backward compatibility
 * Run with: bun test src/lib/__tests__/i18n.test.ts
 */

import { describe, expect, test } from "bun:test";
import { normalizeLocale, isLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n";

describe("i18n locale handling", () => {
  describe("normalizeLocale", () => {
    test("accepts full locale codes", () => {
      expect(normalizeLocale("pt-BR")).toBe("pt-BR");
      expect(normalizeLocale("en-US")).toBe("en-US");
    });

    test("accepts legacy simplified codes", () => {
      expect(normalizeLocale("pt")).toBe("pt-BR");
      expect(normalizeLocale("en")).toBe("en-US");
    });

    test("is case-insensitive", () => {
      expect(normalizeLocale("PT-BR")).toBe("pt-BR");
      expect(normalizeLocale("PT")).toBe("pt-BR");
      expect(normalizeLocale("En-Us")).toBe("en-US");
      expect(normalizeLocale("EN")).toBe("en-US");
    });

    test("normalizes other Portuguese variants to pt-BR", () => {
      expect(normalizeLocale("pt-PT")).toBe("pt-BR");
      expect(normalizeLocale("pt-AO")).toBe("pt-BR"); // Angola
    });

    test("normalizes other English variants to en-US", () => {
      expect(normalizeLocale("en-GB")).toBe("en-US");
      expect(normalizeLocale("en-CA")).toBe("en-US");
      expect(normalizeLocale("en-AU")).toBe("en-US");
    });

    test("returns undefined for unsupported locales", () => {
      expect(normalizeLocale("fr")).toBeUndefined();
      expect(normalizeLocale("es")).toBeUndefined();
      expect(normalizeLocale("de-DE")).toBeUndefined();
      expect(normalizeLocale("invalid")).toBeUndefined();
    });
  });

  describe("isLocale", () => {
    test("accepts only full locale codes", () => {
      expect(isLocale("pt-BR")).toBe(true);
      expect(isLocale("en-US")).toBe(true);
    });

    test("rejects legacy simplified codes", () => {
      expect(isLocale("pt")).toBe(false);
      expect(isLocale("en")).toBe(false);
    });

    test("rejects unsupported locales", () => {
      expect(isLocale("fr")).toBe(false);
      expect(isLocale("es-ES")).toBe(false);
    });
  });

  describe("constants", () => {
    test("DEFAULT_LOCALE is pt-BR", () => {
      expect(DEFAULT_LOCALE).toBe("pt-BR");
    });

    test("SUPPORTED_LOCALES contains pt-BR and en-US", () => {
      expect(SUPPORTED_LOCALES).toContain("pt-BR");
      expect(SUPPORTED_LOCALES).toContain("en-US");
      expect(SUPPORTED_LOCALES).toHaveLength(2);
    });
  });
});
