import { describe, expect, test } from "bun:test";
import {
  addSnackbar,
  DEFAULT_DURATION,
  MAX_VISIBLE,
  removeSnackbar,
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
  test("errors stay longest, info shortest", () => {
    expect(DEFAULT_DURATION.error).toBeGreaterThan(DEFAULT_DURATION.warn);
    expect(DEFAULT_DURATION.warn).toBeGreaterThan(DEFAULT_DURATION.info);
  });
});
