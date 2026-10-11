import { describe, expect, test } from "bun:test";
import { reserveFreshId } from "../reserve";

/** In-memory stand-in with the same contract as Seedable.reservePetId. */
function fakeRepo(taken: string[]) {
  const ids = new Set(taken);
  const calls: string[] = [];
  return {
    calls,
    ids,
    reservePetId: async (id: string) => {
      calls.push(id);
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    },
  };
}

const sequence = (...ids: string[]) => {
  let i = 0;
  return () => ids[i++ % ids.length];
};

describe("reserveFreshId", () => {
  test("reserves and returns an unused id", async () => {
    const repo = fakeRepo([]);
    expect(await reserveFreshId(repo, sequence("aaa"))).toBe("aaa");
    expect(repo.ids.has("aaa")).toBe(true);
  });

  test("draws again when the id is already taken", async () => {
    const repo = fakeRepo(["aaa", "bbb"]);
    expect(await reserveFreshId(repo, sequence("aaa", "bbb", "ccc"))).toBe("ccc");
    expect(repo.calls).toEqual(["aaa", "bbb", "ccc"]);
  });

  test("gives up with null after repeated collisions", async () => {
    const repo = fakeRepo(["aaa"]);
    expect(await reserveFreshId(repo, sequence("aaa"))).toBeNull();
    expect(repo.calls).toHaveLength(5);
  });
});
