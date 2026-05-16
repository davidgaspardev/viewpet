/**
 * Test file to verify Database provider abstraction and implementations
 * Run with: bun test src/lib/__tests__/database.test.ts
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getDatabaseProvider, resetDatabaseProvider } from "../database";
import { LocalKVSProvider } from "../database/local";
import type { Pet } from "@/types/pet";

const TEST_DB_PATH = join(process.cwd(), "data", "test.db.json");

function cleanupTestDb() {
  if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH);
}

describe("Database Provider Abstraction", () => {
  beforeEach(() => {
    resetDatabaseProvider();
    delete process.env.DATABASE_PROVIDER;
  });

  afterEach(() => {
    resetDatabaseProvider();
  });

  describe("Factory", () => {
    test("returns a singleton instance", () => {
      const provider1 = getDatabaseProvider();
      const provider2 = getDatabaseProvider();
      expect(provider1).toBe(provider2);
    });

    test("defaults to local (filesystem) provider", () => {
      const provider = getDatabaseProvider();
      expect(provider).toBeInstanceOf(LocalKVSProvider);
    });

    test("uses local provider when DATABASE_PROVIDER=local", () => {
      process.env.DATABASE_PROVIDER = "local";
      const provider = getDatabaseProvider();
      expect(provider).toBeInstanceOf(LocalKVSProvider);
    });
  });

  describe("LocalKVSProvider", () => {
    let provider: LocalKVSProvider;

    beforeEach(() => {
      cleanupTestDb();
      provider = new LocalKVSProvider(TEST_DB_PATH);
    });

    afterEach(() => {
      cleanupTestDb();
    });

    describe("getPetEntry", () => {
      test("returns missing status for non-existent keys", async () => {
        const entry = await provider.getPetEntry("nonexistent");
        expect(entry.status).toBe("missing");
      });

      test("returns empty status for reserved keys", async () => {
        await provider.reservePetId("reserved");
        const entry = await provider.getPetEntry("reserved");
        expect(entry.status).toBe("empty");
      });

      test("returns filled status with pet data", async () => {
        const pet: Pet = {
          name: "Max",
          picture: "https://example.com/max.jpg",
          birthdate: "2020-01-01T00:00:00.000Z",
          guardian: {
            name: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
          },
        };
        await provider.setPet("max123", pet);
        const entry = await provider.getPetEntry("max123");
        expect(entry.status).toBe("filled");
        if (entry.status === "filled") {
          expect(entry.pet).toEqual(pet);
        }
      });
    });

    describe("setPet", () => {
      test("stores pet data", async () => {
        const pet: Pet = {
          name: "Luna",
          picture: "https://example.com/luna.jpg",
          birthdate: "2019-05-15T00:00:00.000Z",
          guardian: {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+0987654321",
          },
        };
        await provider.setPet("luna456", pet);
        const entry = await provider.getPetEntry("luna456");
        expect(entry.status).toBe("filled");
        if (entry.status === "filled") {
          expect(entry.pet.name).toBe("Luna");
        }
      });

      test("overwrites existing data", async () => {
        const pet1: Pet = {
          name: "Old Name",
          picture: "https://example.com/old.jpg",
          birthdate: "2020-01-01T00:00:00.000Z",
          guardian: { name: "Owner", email: "owner@example.com", phone: "+1111111111" },
        };
        const pet2: Pet = {
          name: "New Name",
          picture: "https://example.com/new.jpg",
          birthdate: "2021-01-01T00:00:00.000Z",
          guardian: { name: "Owner", email: "owner@example.com", phone: "+1111111111" },
        };
        await provider.setPet("test123", pet1);
        await provider.setPet("test123", pet2);
        const entry = await provider.getPetEntry("test123");
        if (entry.status === "filled") {
          expect(entry.pet.name).toBe("New Name");
        }
      });
    });

    describe("reservePetId", () => {
      test("reserves a non-existent ID", async () => {
        await provider.reservePetId("reserved1");
        const entry = await provider.getPetEntry("reserved1");
        expect(entry.status).toBe("empty");
      });

      test("does not overwrite existing data", async () => {
        const pet: Pet = {
          name: "Existing",
          picture: "https://example.com/existing.jpg",
          birthdate: "2020-01-01T00:00:00.000Z",
          guardian: { name: "Owner", email: "owner@example.com", phone: "+1111111111" },
        };
        await provider.setPet("existing123", pet);
        await provider.reservePetId("existing123");
        const entry = await provider.getPetEntry("existing123");
        expect(entry.status).toBe("filled");
        if (entry.status === "filled") {
          expect(entry.pet.name).toBe("Existing");
        }
      });
    });

    describe("listPetIds", () => {
      test("returns empty array when no pets", async () => {
        const ids = await provider.listPetIds();
        expect(ids).toEqual([]);
      });

      test("returns all pet IDs", async () => {
        await provider.reservePetId("id1");
        await provider.setPet("id2", {
          name: "Pet2",
          picture: "https://example.com/pet2.jpg",
          birthdate: "2020-01-01T00:00:00.000Z",
          guardian: { name: "Owner", email: "owner@example.com", phone: "+1111111111" },
        });
        const ids = await provider.listPetIds();
        expect(ids).toHaveLength(2);
        expect(ids).toContain("id1");
        expect(ids).toContain("id2");
      });
    });

    describe("listPetEntries", () => {
      test("returns empty array when no pets", async () => {
        const entries = await provider.listPetEntries();
        expect(entries).toEqual([]);
      });

      test("returns entries with correct status and names", async () => {
        await provider.reservePetId("empty1");
        await provider.setPet("filled1", {
          name: "Buddy",
          picture: "https://example.com/buddy.jpg",
          birthdate: "2020-01-01T00:00:00.000Z",
          guardian: { name: "Owner", email: "owner@example.com", phone: "+1111111111" },
        });

        const entries = await provider.listPetEntries();
        expect(entries).toHaveLength(2);

        const emptyEntry = entries.find((e) => e.id === "empty1");
        expect(emptyEntry?.status).toBe("empty");
        expect(emptyEntry?.name).toBeUndefined();

        const filledEntry = entries.find((e) => e.id === "filled1");
        expect(filledEntry?.status).toBe("filled");
        expect(filledEntry?.name).toBe("Buddy");
      });
    });

    describe("utility methods", () => {
      test("clear removes all data", () => {
        provider.clear();
        expect(provider.size()).toBe(0);
      });

      test("size returns correct count", async () => {
        expect(provider.size()).toBe(0);
        await provider.reservePetId("id1");
        expect(provider.size()).toBe(1);
        await provider.reservePetId("id2");
        expect(provider.size()).toBe(2);
      });

      test("data persists across provider instances", async () => {
        await provider.setPet("persist1", {
          name: "Persistent",
          picture: "https://example.com/p.jpg",
          birthdate: "2020-01-01T00:00:00.000Z",
          guardian: { name: "Owner", email: "o@example.com", phone: "+1" },
        });
        const provider2 = new LocalKVSProvider(TEST_DB_PATH);
        const entry = await provider2.getPetEntry("persist1");
        expect(entry.status).toBe("filled");
      });
    });
  });

  describe("Backward Compatibility (kvs.ts facade)", () => {
    test("facade functions work correctly", async () => {
      const { getPetEntry, setPet, reservePetId, listPetIds, listPetEntries } =
        await import("../kvs");

      const missingEntry = await getPetEntry("nonexistent");
      expect(missingEntry.status).toBe("missing");

      await reservePetId("reserved");
      const reservedEntry = await getPetEntry("reserved");
      expect(reservedEntry.status).toBe("empty");

      const pet: Pet = {
        name: "Facade Test",
        picture: "https://example.com/facade.jpg",
        birthdate: "2020-01-01T00:00:00.000Z",
        guardian: { name: "Test Owner", email: "test@example.com", phone: "+1234567890" },
      };
      await setPet("facade123", pet);
      const filledEntry = await getPetEntry("facade123");
      expect(filledEntry.status).toBe("filled");

      const ids = await listPetIds();
      expect(ids).toContain("reserved");
      expect(ids).toContain("facade123");

      const entries = await listPetEntries();
      expect(entries.length).toBeGreaterThan(0);
    });
  });
});
