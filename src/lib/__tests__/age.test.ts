import { describe, expect, test } from "bun:test";
import { ageInYears, ageInMonths, formatAge } from "../utils/age";

const d = (s: string) => new Date(s);

describe("ageInYears", () => {
  test("returns correct age on exact birthday", () => {
    expect(ageInYears(d("2020-06-15"), d("2024-06-15"))).toBe(4);
  });

  test("returns one less before birthday in the same year", () => {
    expect(ageInYears(d("2020-06-15"), d("2024-06-14"))).toBe(3);
  });

  test("returns correct age when birthday has already passed this year", () => {
    expect(ageInYears(d("2020-03-01"), d("2024-06-15"))).toBe(4);
  });

  test("returns 0 for pet born today", () => {
    const today = new Date();
    expect(ageInYears(today, today)).toBe(0);
  });

  test("returns 0 when birthdate is in the future", () => {
    expect(ageInYears(d("2030-01-01"), d("2024-01-01"))).toBe(0);
  });

  test("handles leap-year birthdate", () => {
    expect(ageInYears(d("2000-02-29"), d("2004-02-29"))).toBe(4);
  });
});

describe("ageInMonths", () => {
  test("returns 0 for pet born today", () => {
    const today = new Date();
    expect(ageInMonths(today, today)).toBe(0);
  });

  test("returns correct months when day has passed", () => {
    expect(ageInMonths(d("2024-01-01"), d("2024-04-10"))).toBe(3);
  });

  test("returns one less when day has not passed yet", () => {
    expect(ageInMonths(d("2024-01-15"), d("2024-04-10"))).toBe(2);
  });

  test("crosses year boundary correctly", () => {
    expect(ageInMonths(d("2023-11-01"), d("2024-02-01"))).toBe(3);
  });

  test("returns 0 for future birthdate", () => {
    expect(ageInMonths(d("2030-01-01"), d("2024-01-01"))).toBe(0);
  });
});

describe("formatAge", () => {
  test("formats years in pt-BR", () => {
    const result = formatAge("2020-01-01T00:00:00.000Z", "pt-BR", d("2024-06-01"));
    expect(result).toMatch(/4/);
    expect(result).toMatch(/ano/);
  });

  test("formats years in en-US", () => {
    const result = formatAge("2020-01-01T00:00:00.000Z", "en-US", d("2024-06-01"));
    expect(result).toMatch(/4/);
    expect(result).toMatch(/year/i);
  });

  test("falls back to months for pet under 1 year in pt-BR", () => {
    const result = formatAge("2024-03-01T00:00:00.000Z", "pt-BR", d("2024-06-01"));
    expect(result).toMatch(/m[eê]s/i);
  });

  test("falls back to months for pet under 1 year in en-US", () => {
    const result = formatAge("2024-03-01T00:00:00.000Z", "en-US", d("2024-06-01"));
    expect(result).toMatch(/month/i);
  });

  test("accepts a Date object as birthdate", () => {
    const result = formatAge(d("2020-01-01T00:00:00.000Z"), "en-US", d("2024-06-01"));
    expect(result).toMatch(/4/);
  });

  test("clamps month count to at least 1", () => {
    const result = formatAge("2024-06-01T00:00:00.000Z", "pt-BR", d("2024-06-01"));
    expect(result).toMatch(/1/);
  });
});
