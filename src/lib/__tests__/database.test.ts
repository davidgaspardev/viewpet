/**
 * Tests for the database provider abstraction and LocalPetRepository.
 * Run with: bun test src/lib/__tests__/database.test.ts
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getRepositoryProvider, resetRepositoryProvider } from "../repository";
import { LocalPetRepository } from "../repository/local";
import type { PetPublicProfile, Guardian } from "@/types/pet";

const TEST_DB_PATH = join(process.cwd(), "data", "test.db.json");

function cleanupTestDb() {
  if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH);
}

function makeGuardian(overrides: Partial<Guardian> = {}): Guardian {
  return {
    name: "Owner",
    email: "owner@example.com",
    phones: [{ e164: "5511999998888", channels: ["call"] }],
    social: {},
    ...overrides,
  };
}

function makePet(overrides: Partial<PetPublicProfile> = {}): PetPublicProfile {
  return {
    name: "Max",
    pictureUrl: "https://example.com/max.jpg",
    birthdate: "2020-01-01T00:00:00.000Z",
    status: "active",
    guardians: [makeGuardian()],
    ...overrides,
  };
}

describe("Database Provider Abstraction", () => {
  beforeEach(() => {
    resetRepositoryProvider();
    delete process.env.DATABASE_PROVIDER;
  });

  afterEach(() => {
    resetRepositoryProvider();
  });

  describe("Factory", () => {
    test("returns a singleton instance", () => {
      const provider1 = getRepositoryProvider();
      const provider2 = getRepositoryProvider();
      expect(provider1).toBe(provider2);
    });

    test("defaults to local (filesystem) provider", () => {
      const provider = getRepositoryProvider();
      expect(provider).toBeInstanceOf(LocalPetRepository);
    });

    test("uses local provider when DATABASE_PROVIDER=local", () => {
      process.env.DATABASE_PROVIDER = "local";
      const provider = getRepositoryProvider();
      expect(provider).toBeInstanceOf(LocalPetRepository);
    });
  });

  describe("LocalPetRepository", () => {
    let provider: LocalPetRepository;

    beforeEach(() => {
      cleanupTestDb();
      provider = new LocalPetRepository(TEST_DB_PATH);
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
        const pet = makePet({
          name: "Max",
          guardians: [makeGuardian({ name: "John Doe", email: "john@example.com" })],
        });
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
        const pet = makePet({
          name: "Luna",
          guardians: [makeGuardian({ name: "Jane Smith", email: "jane@example.com" })],
        });
        await provider.setPet("luna456", pet);
        const entry = await provider.getPetEntry("luna456");
        expect(entry.status).toBe("filled");
        if (entry.status === "filled") {
          expect(entry.pet.name).toBe("Luna");
          expect(entry.pet.guardians[0]?.name).toBe("Jane Smith");
        }
      });

      test("overwrites existing data", async () => {
        await provider.setPet("test123", makePet({ name: "Old Name" }));
        await provider.setPet("test123", makePet({ name: "New Name" }));
        const entry = await provider.getPetEntry("test123");
        if (entry.status === "filled") {
          expect(entry.pet.name).toBe("New Name");
        }
      });

      test("supports multiple guardians per pet", async () => {
        const pet = makePet({
          guardians: [
            makeGuardian({ name: "Primary", email: "a@example.com" }),
            makeGuardian({ name: "Secondary", email: "b@example.com" }),
          ],
        });
        await provider.setPet("multi", pet);
        const entry = await provider.getPetEntry("multi");
        if (entry.status === "filled") {
          expect(entry.pet.guardians).toHaveLength(2);
          expect(entry.pet.guardians[0]?.name).toBe("Primary");
          expect(entry.pet.guardians[1]?.name).toBe("Secondary");
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
        await provider.setPet("existing123", makePet({ name: "Existing" }));
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
        await provider.setPet("id2", makePet({ name: "Pet2" }));
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
        await provider.setPet("filled1", makePet({ name: "Buddy" }));

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

      test("size returns correct count of pets", async () => {
        expect(provider.size()).toBe(0);
        await provider.reservePetId("id1");
        expect(provider.size()).toBe(1);
        await provider.reservePetId("id2");
        expect(provider.size()).toBe(2);
      });

      test("data persists across provider instances", async () => {
        await provider.setPet("persist1", makePet({ name: "Persistent" }));
        const provider2 = new LocalPetRepository(TEST_DB_PATH);
        const entry = await provider2.getPetEntry("persist1");
        expect(entry.status).toBe("filled");
      });
    });
  });

  describe("LocalPetRepository — full workflow", () => {
    const FACADE_DB_PATH = join(process.cwd(), "data", "facade.test.db.json");

    beforeEach(() => {
      if (existsSync(FACADE_DB_PATH)) rmSync(FACADE_DB_PATH);
      resetRepositoryProvider();
      process.env.DATABASE_PROVIDER = "local";
    });

    afterEach(() => {
      resetRepositoryProvider();
      if (existsSync(FACADE_DB_PATH)) rmSync(FACADE_DB_PATH);
    });

    test("facade delegates to the active provider", async () => {
      const facadeProvider = new LocalPetRepository(FACADE_DB_PATH);

      const missingEntry = await facadeProvider.getPetEntry("nonexistent");
      expect(missingEntry.status).toBe("missing");

      await facadeProvider.reservePetId("reserved");
      expect((await facadeProvider.getPetEntry("reserved")).status).toBe("empty");

      const pet = makePet({ name: "Facade Test" });
      await facadeProvider.setPet("facade123", pet);
      expect((await facadeProvider.getPetEntry("facade123")).status).toBe("filled");

      const ids = await facadeProvider.listPetIds();
      expect(ids).toContain("reserved");
      expect(ids).toContain("facade123");

      const entries = await facadeProvider.listPetEntries();
      expect(entries.length).toBe(2);
    });
  });
});
