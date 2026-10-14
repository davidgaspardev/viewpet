import { describe, expect, test } from "bun:test";

import type { PetEntrySummary } from "@/lib/repository";

import { countByStatus, filterByStatus, petUrl } from "../entries";

const entries: PetEntrySummary = [
  { id: "a", status: "reserved" },
  { id: "b", status: "active", name: "Buddy" },
  { id: "c", status: "lost", name: "Rex" },
  { id: "d", status: "reserved" },
];

describe("countByStatus", () => {
  test("counts each status and the total", () => {
    expect(countByStatus(entries)).toEqual({ all: 4, reserved: 2, active: 1, lost: 1 });
  });

  test("is all zeros for an empty list", () => {
    expect(countByStatus([])).toEqual({ all: 0, reserved: 0, active: 0, lost: 0 });
  });
});

describe("filterByStatus", () => {
  test("`all` keeps every entry in order", () => {
    expect(filterByStatus(entries, "all").map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
  });

  test("keeps only the requested status", () => {
    expect(filterByStatus(entries, "reserved").map((e) => e.id)).toEqual(["a", "d"]);
    expect(filterByStatus(entries, "lost").map((e) => e.id)).toEqual(["c"]);
  });

  test("returns an empty list when nothing matches", () => {
    expect(filterByStatus([{ id: "a", status: "reserved" }], "active")).toEqual([]);
  });
});

describe("petUrl", () => {
  test("joins origin and id under /view", () => {
    expect(petUrl("https://viewpet.info", "abc123")).toBe("https://viewpet.info/view/abc123");
  });
});
