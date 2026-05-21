import { describe, expect, test } from "bun:test";
import { generateHashId, isHashId, HASH_ID_LENGTH } from "../utils/ids";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

describe("generateHashId", () => {
  test("returns a string of the correct length", () => {
    expect(generateHashId()).toHaveLength(HASH_ID_LENGTH);
  });

  test("uses only characters from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateHashId();
      for (const char of id) {
        expect(ALPHABET).toContain(char);
      }
    }
  });

  test("generates unique IDs across many calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, generateHashId));
    expect(ids.size).toBe(1000);
  });

  test("never contains visually ambiguous characters (0, O, 1, l, I)", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateHashId();
      expect(id).not.toMatch(/[0O1lI]/);
    }
  });

  test("never contains i or o (confused with 1 and 0)", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateHashId();
      expect(id).not.toMatch(/[ioIO]/);
    }
  });
});

describe("isHashId", () => {
  test("accepts a freshly generated ID", () => {
    expect(isHashId(generateHashId())).toBe(true);
  });

  test("accepts all valid alphabet characters at correct length", () => {
    const validId = "23456789abcd"; // 12 chars, all from alphabet
    expect(isHashId(validId)).toBe(true);
  });

  test("rejects IDs that are too short", () => {
    expect(isHashId("abc23456def")).toBe(false); // 11 chars
  });

  test("rejects IDs that are too long", () => {
    expect(isHashId("abc23456defgh")).toBe(false); // 13 chars
  });

  test("rejects empty string", () => {
    expect(isHashId("")).toBe(false);
  });

  test("rejects IDs with characters outside the alphabet", () => {
    expect(isHashId("abc23456def0")).toBe(false); // contains 0
    expect(isHashId("abc23456defO")).toBe(false); // contains O
    expect(isHashId("abc23456def!")).toBe(false); // contains !
    expect(isHashId("abc23456def/")).toBe(false); // contains /
    expect(isHashId("ABC23456DEFG")).toBe(false); // uppercase
  });

  test("rejects IDs with path traversal characters", () => {
    expect(isHashId("../evil------")).toBe(false);
    expect(isHashId("has/slash----")).toBe(false);
    expect(isHashId("has spaces--x")).toBe(false);
  });
});
