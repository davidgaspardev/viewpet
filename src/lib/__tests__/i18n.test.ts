/**
 * Test file to verify locale normalization and backward compatibility
 * Run with: bun test src/lib/__tests__/i18n.test.ts
 */

import { describe, expect, test } from "bun:test";
import {
  normalizeLocale,
  isLocale,
  getDictionary,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localeFromLanguages,
  parseAcceptLanguage,
} from "../i18n";
import { tagPath } from "../utils/routes";

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

    test("accepts the underscore spelling some Android browsers send", () => {
      expect(normalizeLocale("pt_BR")).toBe("pt-BR");
      expect(normalizeLocale("pt_br")).toBe("pt-BR");
      expect(normalizeLocale("en_US")).toBe("en-US");
      expect(normalizeLocale(" pt-BR ")).toBe("pt-BR");
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

describe("landing copy", () => {
  test("shows the tag page path from the single route definition", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getDictionary(locale).landingBody).toContain(tagPath("<hashId>"));
    }
  });
});

describe("parseAcceptLanguage", () => {
  test("lists the tags in the header's order when none has a weight", () => {
    expect(parseAcceptLanguage("pt-BR,pt,en")).toEqual(["pt-BR", "pt", "en"]);
  });

  test("orders by q weight, keeping the header's order between equal weights", () => {
    expect(parseAcceptLanguage("en-US;q=0.5, pt-BR;q=0.9, es;q=0.9")).toEqual(["pt-BR", "es", "en-US"]);
    expect(parseAcceptLanguage("pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")).toEqual(["pt-BR", "pt", "en-US", "en"]);
  });

  test("drops what the client rules out, the wildcard and blanks", () => {
    expect(parseAcceptLanguage("en;q=0, pt-BR;q=0.8, *;q=0.5")).toEqual(["pt-BR"]);
    expect(parseAcceptLanguage("")).toEqual([]);
    expect(parseAcceptLanguage(" , ,pt")).toEqual(["pt"]);
  });
});

describe("localeFromLanguages", () => {
  test("is the first supported language, skipping unsupported ones", () => {
    expect(localeFromLanguages(["fr", "pt_BR", "en"])).toBe("pt-BR");
    expect(localeFromLanguages(["en-BR", "pt-BR"])).toBe("en-US");
    expect(localeFromLanguages(["fr", "de"])).toBeUndefined();
    expect(localeFromLanguages([])).toBeUndefined();
  });

  test("a Portuguese phone gets Portuguese from any of its usual headers", () => {
    for (const header of ["pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7", "pt-BR", "pt_BR,en;q=0.5", "pt-BR;q=0.9, en;q=0.4"]) {
      expect(localeFromLanguages(parseAcceptLanguage(header))).toBe("pt-BR");
    }
  });
});
