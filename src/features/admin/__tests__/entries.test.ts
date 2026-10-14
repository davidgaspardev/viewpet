import { describe, expect, test } from "bun:test";

import type { PetEntrySummary } from "@/lib/repository";

import { countByStatus, filterAfterReserve, filterByStatus, FILTER_LABELS, STATUS_FILTERS } from "../entries";

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

describe("filterAfterReserve", () => {
  test("keeps the reserved filter", () => {
    expect(filterAfterReserve("reserved")).toBe("reserved");
  });

  test("falls back to all, so the new reserved entry is not hidden", () => {
    for (const filter of ["all", "active", "lost"] as const) {
      expect(filterAfterReserve(filter)).toBe("all");
    }
  });
});

describe("filters", () => {
  test("offer `all` plus every status, each with a label", () => {
    expect([...STATUS_FILTERS]).toEqual(["all", "reserved", "active", "lost"]);
    for (const filter of STATUS_FILTERS) expect(FILTER_LABELS[filter].length).toBeGreaterThan(0);
  });
});
