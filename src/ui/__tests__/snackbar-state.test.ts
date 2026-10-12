import { describe, expect, test } from "bun:test";
import {
  addSnackbar,
  DEFAULT_DURATION,
  MAX_VISIBLE,
  removeSnackbar,
  resolveDuration,
  type SnackbarItem,
} from "../snackbar.state";

const item = (id: string, message = id, variant: SnackbarItem["variant"] = "info"): SnackbarItem => ({
  id,
  message,
  variant,
  duration: DEFAULT_DURATION[variant],
});

describe("addSnackbar", () => {
  test("appends in order", () => {
    const list = addSnackbar(addSnackbar([], item("a")), item("b"));
    expect(list.map((i) => i.id)).toEqual(["a", "b"]);
  });

  test("replaces an identical message of the same variant instead of stacking it", () => {
    const first = item("a", "Saved");
    const second = item("b", "Saved");
    const list = addSnackbar(addSnackbar([], first), second);
    expect(list).toEqual([second]);
  });

  test("keeps the same text when the variant differs", () => {
    const list = addSnackbar(addSnackbar([], item("a", "Oops", "warn")), item("b", "Oops", "error"));
    expect(list.map((i) => i.id)).toEqual(["a", "b"]);
  });

  test("drops the oldest beyond the visible limit", () => {
    let list: SnackbarItem[] = [];
    for (let n = 1; n <= MAX_VISIBLE + 2; n++) list = addSnackbar(list, item(`m${n}`));
    expect(list).toHaveLength(MAX_VISIBLE);
    expect(list[0].id).toBe("m3");
    expect(list.at(-1)!.id).toBe(`m${MAX_VISIBLE + 2}`);
  });

  test("evicts the oldest non-error first, so unread errors survive a flurry of toasts", () => {
    let list: SnackbarItem[] = [item("e1", "boom", "error")];
    for (const id of ["i1", "i2", "i3", "i4"]) list = addSnackbar(list, item(id));
    expect(list.map((i) => i.id)).toEqual(["e1", "i3", "i4"]);
  });

  test("evicts the oldest error only when everything is an error", () => {
    let list: SnackbarItem[] = [];
    for (const n of [1, 2, 3, 4]) list = addSnackbar(list, item(`e${n}`, `err ${n}`, "error"));
    expect(list.map((i) => i.id)).toEqual(["e2", "e3", "e4"]);
  });

  test("never evicts the snackbar being added", () => {
    const list = [item("e1", "a", "error"), item("e2", "b", "error"), item("e3", "c", "error")];
    expect(addSnackbar(list, item("i1")).map((i) => i.id)).toEqual(["e2", "e3", "i1"]);
  });

  test("does not mutate its input", () => {
    const original = [item("a")];
    addSnackbar(original, item("b"));
    expect(original.map((i) => i.id)).toEqual(["a"]);
  });
});

describe("removeSnackbar", () => {
  test("removes by id and ignores unknown ids", () => {
    const list = [item("a"), item("b")];
    expect(removeSnackbar(list, "a").map((i) => i.id)).toEqual(["b"]);
    expect(removeSnackbar(list, "zzz")).toEqual(list);
  });
});

describe("DEFAULT_DURATION", () => {
  test("info and warn time out, errors persist", () => {
    expect(DEFAULT_DURATION.info).toBeGreaterThan(0);
    expect(DEFAULT_DURATION.warn).toBeGreaterThan(DEFAULT_DURATION.info!);
    expect(DEFAULT_DURATION.error).toBeNull();
  });
});

describe("resolveDuration", () => {
  test("undefined falls back to the variant's default", () => {
    expect(resolveDuration("info", undefined)).toBe(DEFAULT_DURATION.info);
    expect(resolveDuration("error", undefined)).toBeNull();
  });

  test("null and non-finite values mean sticky", () => {
    expect(resolveDuration("info", null)).toBeNull();
    expect(resolveDuration("info", Infinity)).toBeNull();
    expect(resolveDuration("info", NaN)).toBeNull();
  });

  test("clamps to what setTimeout supports", () => {
    expect(resolveDuration("info", 1500)).toBe(1500);
    expect(resolveDuration("info", -5)).toBe(0);
    expect(resolveDuration("info", 3e9)).toBe(2_147_483_647);
  });
});
