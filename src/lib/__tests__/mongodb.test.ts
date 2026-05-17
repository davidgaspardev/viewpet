/**
 * Integration tests for MongoDBKVSProvider using an in-memory MongoDB instance.
 * Run with: bun test src/lib/__tests__/mongodb.test.ts
 */

import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { MongoDBKVSProvider, resetMongoClient } from "../database/mongodb";
import type { PetPublicProfile } from "@/types/pet";

let mongod: MongoMemoryServer;
let cleanupClient: MongoClient;

const COLLECTION = "pets";

function makePet(overrides: Partial<PetPublicProfile> = {}): PetPublicProfile {
  return {
    name: "Test Pet",
    pictureUrl: "https://example.com/pet.jpg",
    birthdate: "2020-01-01T00:00:00.000Z",
    status: "active",
    guardian: {
      name: "Test Guardian",
      email: "guardian@example.com",
      phones: [{ e164: "5511999999999", display: "(11) 99999-9999", channels: ["call", "whatsapp"] }],
      social: {},
    },
    ...overrides,
  };
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
  // Drop collection and reset singleton so each test starts fresh
  await cleanupClient.db("viewpet").collection(COLLECTION).drop().catch(() => {});
  resetMongoClient();
});

describe("MongoDBKVSProvider", () => {
  describe("getPetEntry", () => {
    test("returns missing for unknown hashId", async () => {
      const provider = new MongoDBKVSProvider();
      const entry = await provider.getPetEntry("nonexistent");
      expect(entry.status).toBe("missing");
    });

    test("returns empty for reserved hashId", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.reservePetId("reserved1");
      const entry = await provider.getPetEntry("reserved1");
      expect(entry.status).toBe("empty");
    });

    test("returns filled with pet data for set pet", async () => {
      const provider = new MongoDBKVSProvider();
      const pet = makePet({ name: "Lupe" });
      await provider.setPet("abc123", pet);
      const entry = await provider.getPetEntry("abc123");
      expect(entry.status).toBe("filled");
      if (entry.status === "filled") {
        expect(entry.pet.name).toBe("Lupe");
        expect(entry.pet.status).toBe("active");
        expect(entry.pet.guardian.name).toBe("Test Guardian");
      }
    });
  });

  describe("setPet", () => {
    test("stores and retrieves full pet profile", async () => {
      const provider = new MongoDBKVSProvider();
      const pet = makePet({ name: "Mel" });
      await provider.setPet("mel123", pet);
      const entry = await provider.getPetEntry("mel123");
      expect(entry.status).toBe("filled");
      if (entry.status === "filled") expect(entry.pet).toEqual(pet);
    });

    test("overwrites existing pet data", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.setPet("dup1", makePet({ name: "Old" }));
      await provider.setPet("dup1", makePet({ name: "New" }));
      const entry = await provider.getPetEntry("dup1");
      if (entry.status === "filled") expect(entry.pet.name).toBe("New");
    });

    test("upgrades a reserved slot to filled", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.reservePetId("slot1");
      await provider.setPet("slot1", makePet({ name: "Upgraded" }));
      const entry = await provider.getPetEntry("slot1");
      expect(entry.status).toBe("filled");
    });

    test("stores 'reserved' status as document field, not as pet status", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.reservePetId("check1");
      const raw = await cleanupClient
        .db("viewpet")
        .collection<{ _id: string; status: string }>(COLLECTION)
        .findOne({ _id: "check1" } as never);
      expect(raw?.status).toBe("reserved");
    });

    test("stored document has status from pet (active/lost), not 'reserved'", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.setPet("filled1", makePet({ status: "active" }));
      const raw = await cleanupClient
        .db("viewpet")
        .collection<{ _id: string; status: string }>(COLLECTION)
        .findOne({ _id: "filled1" } as never);
      expect(raw?.status).toBe("active");
    });
  });

  describe("reservePetId", () => {
    test("reserves a new ID", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.reservePetId("new1");
      const entry = await provider.getPetEntry("new1");
      expect(entry.status).toBe("empty");
    });

    test("does not overwrite an existing filled pet", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.setPet("existing1", makePet({ name: "Keep me" }));
      await provider.reservePetId("existing1");
      const entry = await provider.getPetEntry("existing1");
      expect(entry.status).toBe("filled");
      if (entry.status === "filled") expect(entry.pet.name).toBe("Keep me");
    });

    test("does not overwrite an existing reserved slot", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.reservePetId("slot2");
      await provider.reservePetId("slot2"); // second call is a no-op
      const ids = await provider.listPetIds();
      expect(ids.filter((id) => id === "slot2")).toHaveLength(1);
    });
  });

  describe("listPetIds", () => {
    test("returns empty array when collection is empty", async () => {
      const provider = new MongoDBKVSProvider();
      expect(await provider.listPetIds()).toEqual([]);
    });

    test("returns all IDs regardless of status", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.reservePetId("id1");
      await provider.setPet("id2", makePet());
      const ids = await provider.listPetIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain("id1");
      expect(ids).toContain("id2");
    });
  });

  describe("listPetEntries", () => {
    test("returns empty array when collection is empty", async () => {
      const provider = new MongoDBKVSProvider();
      expect(await provider.listPetEntries()).toEqual([]);
    });

    test("returns correct status and name for each entry", async () => {
      const provider = new MongoDBKVSProvider();
      await provider.reservePetId("empty1");
      await provider.setPet("filled1", makePet({ name: "Buddy" }));

      const entries = await provider.listPetEntries();
      expect(entries).toHaveLength(2);

      const empty = entries.find((e) => e.id === "empty1");
      expect(empty?.status).toBe("empty");
      expect(empty?.name).toBeUndefined();

      const filled = entries.find((e) => e.id === "filled1");
      expect(filled?.status).toBe("filled");
      expect(filled?.name).toBe("Buddy");
    });
  });
});
