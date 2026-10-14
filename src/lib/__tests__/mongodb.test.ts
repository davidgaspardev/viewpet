/**
 * Integration tests for MongoPetRepository using an in-memory MongoDB instance.
 * Run with: bun test src/lib/__tests__/mongodb.test.ts
 */

import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { MongoPetRepository, resetMongoClient } from "../repository/mongodb/mongodb";
import type { Pet } from "@/types/pet";

let mongod: MongoMemoryServer;
let cleanupClient: MongoClient;

const COLLECTIONS = ["pets", "guardians", "lostEvents"] as const;

function makePet(overrides: Partial<Pet> = {}): Pet {
  return {
    name: "Test Pet",
    pictureUrl: "https://example.com/pet.jpg",
    birthdate: "2020-01-01T00:00:00.000Z",
    status: "active",
    guardians: [
      {
        name: "Test Guardian",
        email: "guardian@example.com",
        phones: [
          {
            e164: "5511999999999",
            display: "(11) 99999-9999",
            channels: ["call", "whatsapp"],
          },
        ],
        social: {},
      },
    ],
    ...overrides,
  };
}

/** Writes a pets document straight to the collection, bypassing the repository (and its types). */
async function insertRawPet(doc: Record<string, unknown>): Promise<void> {
  const now = new Date();
  await cleanupClient
    .db("viewpet")
    .collection("pets")
    .insertOne({ createdAt: now, updatedAt: now, ...doc } as never);
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri() + "viewpet";
  cleanupClient = new MongoClient(mongod.getUri() + "viewpet");
  await cleanupClient.connect();
});

afterAll(async () => {
  await cleanupClient.close();
  await mongod.stop();
  delete process.env.MONGODB_URI;
});

beforeEach(async () => {
  // Drop collections and reset singleton so each test starts fresh
  const db = cleanupClient.db("viewpet");
  for (const name of COLLECTIONS) {
    await db.collection(name).drop().catch(() => {});
  }
  resetMongoClient();
});

describe("MongoPetRepository", () => {
  describe("getPetEntry", () => {
    test("returns missing for unknown hashId", async () => {
      const provider = new MongoPetRepository();
      const entry = await provider.getPetEntry("nonexistent");
      expect(entry.status).toBe("missing");
    });

    test("returns reserved for a reserved hashId", async () => {
      const provider = new MongoPetRepository();
      await provider.reservePetId("reserved1");
      const entry = await provider.getPetEntry("reserved1");
      expect(entry.status).toBe("reserved");
    });

    test("returns the pet status with pet data for a set pet", async () => {
      const provider = new MongoPetRepository();
      const pet = makePet({ name: "Lupe" });
      await provider.setPet("abc123", pet);
      const entry = await provider.getPetEntry("abc123");
      expect(entry.status).toBe("active");
      if ("pet" in entry) {
        expect(entry.pet.name).toBe("Lupe");
        expect(entry.pet.status).toBe("active");
        expect(entry.pet.guardians[0]?.name).toBe("Test Guardian");
      }
    });
  });

  describe("setPet", () => {
    test("stores and retrieves full pet profile", async () => {
      const provider = new MongoPetRepository();
      const pet = makePet({ name: "Mel" });
      await provider.setPet("mel123", pet);
      const entry = await provider.getPetEntry("mel123");
      expect(entry.status).toBe("active");
      if ("pet" in entry) expect(entry.pet).toEqual(pet);
    });

    test("overwrites existing pet data", async () => {
      const provider = new MongoPetRepository();
      await provider.setPet("dup1", makePet({ name: "Old" }));
      await provider.setPet("dup1", makePet({ name: "New" }));
      const entry = await provider.getPetEntry("dup1");
      if ("pet" in entry) expect(entry.pet.name).toBe("New");
    });

    test("upgrades a reserved slot to a registered pet", async () => {
      const provider = new MongoPetRepository();
      await provider.reservePetId("slot1");
      await provider.setPet("slot1", makePet({ name: "Upgraded" }));
      const entry = await provider.getPetEntry("slot1");
      expect(entry.status).toBe("active");
    });

    test("stores 'reserved' status as document field, not as pet status", async () => {
      const provider = new MongoPetRepository();
      await provider.reservePetId("check1");
      const raw = await cleanupClient
        .db("viewpet")
        .collection<{ _id: string; status: string }>("pets")
        .findOne({ _id: "check1" } as never);
      expect(raw?.status).toBe("reserved");
    });

    test("stored document has status from pet (active/lost), not 'reserved'", async () => {
      const provider = new MongoPetRepository();
      await provider.setPet("filled1", makePet({ status: "active" }));
      const raw = await cleanupClient
        .db("viewpet")
        .collection<{ _id: string; status: string }>("pets")
        .findOne({ _id: "filled1" } as never);
      expect(raw?.status).toBe("active");
    });
  });

  describe("reservePetId", () => {
    test("reserves a new ID", async () => {
      const provider = new MongoPetRepository();
      expect(await provider.reservePetId("new1")).toBe(true);
      const entry = await provider.getPetEntry("new1");
      expect(entry.status).toBe("reserved");
    });

    test("reports false when the ID is already taken", async () => {
      const provider = new MongoPetRepository();
      expect(await provider.reservePetId("dup1")).toBe(true);
      expect(await provider.reservePetId("dup1")).toBe(false);
      await provider.setPet("dup2", makePet());
      expect(await provider.reservePetId("dup2")).toBe(false);
    });

    test("does not overwrite an existing registered pet", async () => {
      const provider = new MongoPetRepository();
      await provider.setPet("existing1", makePet({ name: "Keep me" }));
      await provider.reservePetId("existing1");
      const entry = await provider.getPetEntry("existing1");
      expect(entry.status).toBe("active");
      if ("pet" in entry) expect(entry.pet.name).toBe("Keep me");
    });

    test("does not overwrite an existing reserved slot", async () => {
      const provider = new MongoPetRepository();
      await provider.reservePetId("slot2");
      await provider.reservePetId("slot2"); // second call is a no-op
      const ids = await provider.listPetIds();
      expect(ids.filter((id) => id === "slot2")).toHaveLength(1);
    });
  });

  describe("listPetIds", () => {
    test("returns empty array when collection is empty", async () => {
      const provider = new MongoPetRepository();
      expect(await provider.listPetIds()).toEqual([]);
    });

    test("returns all IDs regardless of status", async () => {
      const provider = new MongoPetRepository();
      await provider.reservePetId("id1");
      await provider.setPet("id2", makePet());
      const ids = await provider.listPetIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain("id1");
      expect(ids).toContain("id2");
    });
  });

  describe("unrecognised stored status", () => {
    const registered = {
      name: "Odd",
      pictureUrl: "https://example.com/odd.jpg",
      birthdate: "2020-01-01T00:00:00.000Z",
      guardianIds: [],
    };

    test("getPetEntry reports a doc with an unknown status as missing instead of publishing it", async () => {
      await insertRawPet({ _id: "odd1", status: "archived", ...registered });
      const provider = new MongoPetRepository();
      expect(await provider.getPetEntry("odd1")).toEqual({ status: "missing" });
    });

    test("getPetEntry reports a doc without a status as missing", async () => {
      await insertRawPet({ _id: "odd2", ...registered });
      const provider = new MongoPetRepository();
      expect(await provider.getPetEntry("odd2")).toEqual({ status: "missing" });
    });

    test("listPetEntries skips docs with an unknown status and keeps the rest", async () => {
      await insertRawPet({ _id: "odd3", status: "archived", ...registered });
      const provider = new MongoPetRepository();
      await provider.reservePetId("fine1");
      expect((await provider.listPetEntries()).map((e) => e.id)).toEqual(["fine1"]);
    });
  });

  describe("listPetEntries", () => {
    test("returns empty array when collection is empty", async () => {
      const provider = new MongoPetRepository();
      expect(await provider.listPetEntries()).toEqual([]);
    });

    test("returns correct status and name for each entry", async () => {
      const provider = new MongoPetRepository();
      await provider.reservePetId("reserved1");
      await provider.setPet("active1", makePet({ name: "Buddy" }));
      await provider.setPet(
        "lost1",
        makePet({
          name: "Rex",
          status: "lost",
          lostEvent: { startedAt: "2026-01-01T00:00:00.000Z", endedAt: null },
        }),
      );

      const entries = await provider.listPetEntries();
      expect(entries).toHaveLength(3);

      const reserved = entries.find((e) => e.id === "reserved1");
      expect(reserved?.status).toBe("reserved");
      expect(reserved?.name).toBeUndefined();

      const active = entries.find((e) => e.id === "active1");
      expect(active?.status).toBe("active");
      expect(active?.name).toBe("Buddy");

      const lost = entries.find((e) => e.id === "lost1");
      expect(lost?.status).toBe("lost");
      expect(lost?.name).toBe("Rex");
    });

    test("lists the newest entries first", async () => {
      const provider = new MongoPetRepository();
      await provider.reservePetId("older");
      await new Promise((resolve) => setTimeout(resolve, 5));
      await provider.reservePetId("newer");

      expect((await provider.listPetEntries()).map((e) => e.id)).toEqual(["newer", "older"]);
    });

    test("orders entries created in the same millisecond deterministically (by id, descending)", async () => {
      const at = new Date("2026-01-01T00:00:00.000Z");
      for (const id of ["b", "c", "a"]) {
        await insertRawPet({ _id: id, status: "reserved", createdAt: at, updatedAt: at });
      }
      const provider = new MongoPetRepository();
      expect((await provider.listPetEntries()).map((e) => e.id)).toEqual(["c", "b", "a"]);
    });

    test("does not break on docs that have no timestamps", async () => {
      await cleanupClient.db("viewpet").collection("pets").insertOne({ _id: "legacy", status: "reserved" } as never);
      const provider = new MongoPetRepository();
      expect((await provider.listPetEntries()).map((e) => e.id)).toEqual(["legacy"]);
    });
  });

  describe("multi-guardian behavior", () => {
    test("preserves guardian order on round-trip", async () => {
      const provider = new MongoPetRepository();
      const pet = makePet({
        guardians: [
          { name: "Primary", email: "primary@example.com", phones: [], social: {} },
          { name: "Secondary", email: "secondary@example.com", phones: [], social: {} },
        ],
      });
      await provider.setPet("ordered1", pet);
      const entry = await provider.getPetEntry("ordered1");
      expect(entry.status).toBe("active");
      if ("pet" in entry) {
        expect(entry.pet.guardians[0]?.name).toBe("Primary");
        expect(entry.pet.guardians[1]?.name).toBe("Secondary");
      }
    });

    test("dedup by email: two pets sharing a guardian share one guardian doc", async () => {
      const provider = new MongoPetRepository();
      const sharedGuardian = { name: "Shared", email: "shared@example.com", phones: [], social: {} };
      await provider.setPet("pet1", makePet({ name: "Pet One", guardians: [sharedGuardian] }));
      await provider.setPet("pet2", makePet({ name: "Pet Two", guardians: [sharedGuardian] }));

      const guardianCount = await cleanupClient
        .db("viewpet")
        .collection("guardians")
        .countDocuments({ email: "shared@example.com" });
      expect(guardianCount).toBe(1);
    });

    test("no-email guardian is cleaned up when pet is updated", async () => {
      const provider = new MongoPetRepository();
      const noEmail = { name: "No Email", phones: [], social: {} };
      await provider.setPet("pet-update", makePet({ guardians: [noEmail] }));

      const newGuardian = { name: "Replacement", email: "replacement@example.com", phones: [], social: {} };
      await provider.setPet("pet-update", makePet({ guardians: [newGuardian] }));

      const orphanCount = await cleanupClient
        .db("viewpet")
        .collection("guardians")
        .countDocuments({ email: { $exists: false } });
      expect(orphanCount).toBe(0);
    });

  });

  describe("lost event lifecycle", () => {
    test("opens an event when a pet transitions to lost and exposes it via pet.lostEvent", async () => {
      const provider = new MongoPetRepository();
      const startedAt = "2026-01-01T00:00:00.000Z";
      await provider.setPet(
        "lost1",
        makePet({
          status: "lost",
          lostEvent: { startedAt, endedAt: null, lastSeenLocation: "Parque" },
        }),
      );

      const entry = await provider.getPetEntry("lost1");
      expect(entry.status).toBe("lost");
      if ("pet" in entry) {
        expect(entry.pet.status).toBe("lost");
        expect(entry.pet.lostEvent?.startedAt).toBe(startedAt);
        expect(entry.pet.lostEvent?.endedAt).toBeNull();
        expect(entry.pet.lostEvent?.lastSeenLocation).toBe("Parque");
      }
    });

    test("closes the open event when the pet returns to active, preserving the doc as history", async () => {
      const provider = new MongoPetRepository();
      const startedAt = "2026-01-01T00:00:00.000Z";
      await provider.setPet(
        "lost2",
        makePet({
          status: "lost",
          lostEvent: { startedAt, endedAt: null, lastSeenLocation: "Parque" },
        }),
      );

      await provider.setPet("lost2", makePet({ status: "active" }));

      // pet.lostEvent is gone because there's no longer an OPEN event...
      const entry = await provider.getPetEntry("lost2");
      expect(entry.status).toBe("active");
      if ("pet" in entry) {
        expect(entry.pet.status).toBe("active");
        expect(entry.pet.lostEvent).toBeUndefined();
      }

      // ...but the doc survives in lostEvents with endedAt stamped.
      const events = await cleanupClient
        .db("viewpet")
        .collection<{ petId: string; startedAt: string; endedAt: string | null }>("lostEvents")
        .find({ petId: "lost2" })
        .toArray();
      expect(events).toHaveLength(1);
      expect(events[0]?.startedAt).toBe(startedAt);
      expect(events[0]?.endedAt).not.toBeNull();
    });

    test("updating an open event preserves startedAt and updates mutable fields", async () => {
      const provider = new MongoPetRepository();
      const originalStart = "2026-01-01T00:00:00.000Z";
      await provider.setPet(
        "lost3",
        makePet({
          status: "lost",
          lostEvent: { startedAt: originalStart, endedAt: null, lastSeenLocation: "A" },
        }),
      );

      // Re-set with a different startedAt and a new location.
      await provider.setPet(
        "lost3",
        makePet({
          status: "lost",
          lostEvent: {
            startedAt: "2099-12-31T00:00:00.000Z",
            endedAt: null,
            lastSeenLocation: "B",
          },
        }),
      );

      const entry = await provider.getPetEntry("lost3");
      if ("pet" in entry) {
        // startedAt of an open event is never overwritten
        expect(entry.pet.lostEvent?.startedAt).toBe(originalStart);
        expect(entry.pet.lostEvent?.lastSeenLocation).toBe("B");
      }

      // Still exactly one event for this pet — no duplicate insert
      const count = await cleanupClient
        .db("viewpet")
        .collection("lostEvents")
        .countDocuments({ petId: "lost3" });
      expect(count).toBe(1);
    });

    test("a pet that goes missing twice has two events, the older one resolved", async () => {
      const provider = new MongoPetRepository();
      await provider.setPet(
        "lost4",
        makePet({
          status: "lost",
          lostEvent: { startedAt: "2025-01-01T00:00:00.000Z", endedAt: null },
        }),
      );
      await provider.setPet("lost4", makePet({ status: "active" }));
      await provider.setPet(
        "lost4",
        makePet({
          status: "lost",
          lostEvent: { startedAt: "2026-06-01T00:00:00.000Z", endedAt: null },
        }),
      );

      const events = await cleanupClient
        .db("viewpet")
        .collection<{ petId: string; startedAt: string; endedAt: string | null }>("lostEvents")
        .find({ petId: "lost4" })
        .sort({ startedAt: 1 })
        .toArray();
      expect(events).toHaveLength(2);
      expect(events[0]?.endedAt).not.toBeNull(); // first one resolved
      expect(events[1]?.endedAt).toBeNull(); // current one still open
    });
  });
});
