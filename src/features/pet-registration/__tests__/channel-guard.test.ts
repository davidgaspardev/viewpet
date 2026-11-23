import { describe, expect, test } from "bun:test";

import { keepOneChannel } from "../components/channelGuard";

const boxes = (...states: boolean[]) => states.map((checked) => ({ checked }));

describe("keepOneChannel", () => {
  test("lets a box be unticked while another stays ticked", () => {
    const list = boxes(false, true, false);
    expect(keepOneChannel(list, list[0])).toBe(false);
    expect(list.map((b) => b.checked)).toEqual([false, true, false]);
  });

  test("ticks the last box back and reports it when it was the only one", () => {
    const list = boxes(false, false, false);
    expect(keepOneChannel(list, list[1])).toBe(true);
    expect(list.map((b) => b.checked)).toEqual([false, true, false]);
  });

  test("ignores boxes that are not mounted yet", () => {
    const list = boxes(true);
    expect(keepOneChannel([null, ...list], list[0])).toBe(false);
  });
});
