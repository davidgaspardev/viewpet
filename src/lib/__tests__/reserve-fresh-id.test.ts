import { describe, expect, test } from "bun:test";
import type { PetEntry } from "@/types/pet";
import { reserveFreshId } from "../../features/admin/reserve";

function fakeRepo(taken: string[]) {
  const reserved: string[] = [];
  return {
    reserved,
    getPetEntry: async (id: string): Promise<PetEntry> =>
      taken.includes(id) || reserved.includes(id) ? { status: "empty" } : { status: "missing" },
    reservePetId: async (id: string) => {
      reserved.push(id);
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
    expect(repo.reserved).toEqual(["aaa"]);
  });

  test("skips ids already in use", async () => {
    const repo = fakeRepo(["aaa", "bbb"]);
    expect(await reserveFreshId(repo, sequence("aaa", "bbb", "ccc"))).toBe("ccc");
    expect(repo.reserved).toEqual(["ccc"]);
  });

  test("gives up with null (reserving nothing) when every attempt collides", async () => {
    const repo = fakeRepo(["aaa"]);
    expect(await reserveFreshId(repo, sequence("aaa"))).toBeNull();
    expect(repo.reserved).toEqual([]);
  });
});
