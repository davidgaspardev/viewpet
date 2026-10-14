import { describe, expect, test } from "bun:test";

import { PET_STATUSES, isPetStatus, isRegisteredStatus } from "@/types/pet";

describe("PET_STATUSES", () => {
  test("lists every lifecycle status in order", () => {
    expect([...PET_STATUSES]).toEqual(["reserved", "active", "lost"]);
  });
});

describe("isPetStatus", () => {
  test("accepts the three lifecycle statuses", () => {
    for (const status of PET_STATUSES) expect(isPetStatus(status)).toBe(true);
  });

  test("rejects anything else, including non-strings", () => {
    for (const value of ["archived", "ACTIVE", "", "missing", "empty", "filled", null, undefined, 1, {}]) {
      expect(isPetStatus(value)).toBe(false);
    }
  });
});

describe("isRegisteredStatus", () => {
  test("accepts statuses of a pet that exists", () => {
    expect(isRegisteredStatus("active")).toBe(true);
    expect(isRegisteredStatus("lost")).toBe(true);
  });

  test("rejects reserved and unknown values", () => {
    for (const value of ["reserved", "archived", "", null, undefined]) {
      expect(isRegisteredStatus(value)).toBe(false);
    }
  });
});
