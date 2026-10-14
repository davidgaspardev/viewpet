/**
 * Tests for the database provider abstraction and LocalPetRepository.
 * Run with: bun test src/lib/__tests__/database.test.ts
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PetRepositoryFactory } from "../repository";
import { LocalPetRepository } from "../repository/local";
import { MongoPetRepository } from "../repository/mongodb/mongodb";
import type { Pet, Guardian } from "@/types/pet";

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

function makePet(overrides: Partial<Pet> = {}): Pet {
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
    PetRepositoryFactory.reset();
    delete process.env.DATABASE_PROVIDER;
  });

  afterEach(() => {
    PetRepositoryFactory.reset();
  });

  describe("Factory", () => {
    test("returns a singleton instance", () => {
      const provider1 = PetRepositoryFactory.getInstance();
      const provider2 = PetRepositoryFactory.getInstance();
      expect(provider1).toBe(provider2);
    });

    test("defaults to local (filesystem) provider", () => {
      const provider = PetRepositoryFactory.getInstance();
      expect(provider).toBeInstanceOf(LocalPetRepository);
    });

    test("uses local provider when DATABASE_PROVIDER=local", () => {
      process.env.DATABASE_PROVIDER = "local";
      const provider = PetRepositoryFactory.getInstance();
      expect(provider).toBeInstanceOf(LocalPetRepository);
    });

    test("uses mongodb provider when DATABASE_PROVIDER=mongodb", () => {
      process.env.DATABASE_PROVIDER = "mongodb";
      const provider = PetRepositoryFactory.getInstance();
      expect(provider).toBeInstanceOf(MongoPetRepository);
    });

    test("falls back to local provider for an unknown DATABASE_PROVIDER value", () => {
      process.env.DATABASE_PROVIDER = "dynamodb";
      const provider = PetRepositoryFactory.getInstance();
      expect(provider).toBeInstanceOf(LocalPetRepository);
    });

    test("ignores DATABASE_PROVIDER changes after the singleton is built", () => {
      process.env.DATABASE_PROVIDER = "local";
      const provider1 = PetRepositoryFactory.getInstance();

      // Changing the env var without calling reset() has no effect — the
      // singleton already picked its provider.
      process.env.DATABASE_PROVIDER = "mongodb";
      const provider2 = PetRepositoryFactory.getInstance();

      expect(provider2).toBe(provider1);
      expect(provider2).toBeInstanceOf(LocalPetRepository);
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

      test("returns reserved status for reserved keys", async () => {
        await provider.reservePetId("reserved");
        const entry = await provider.getPetEntry("reserved");
        expect(entry.status).toBe("reserved");
      });

      test("returns the pet status with pet data", async () => {
        const pet = makePet({
          name: "Max",
          guardians: [makeGuardian({ name: "John Doe", email: "john@example.com" })],
        });
        await provider.setPet("max123", pet);
        const entry = await provider.getPetEntry("max123");
        expect(entry.status).toBe("active");
        if ("pet" in entry) {
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
        expect(entry.status).toBe("active");
        if ("pet" in entry) {
          expect(entry.pet.name).toBe("Luna");
          expect(entry.pet.guardians[0]?.name).toBe("Jane Smith");
        }
      });

      test("overwrites existing data", async () => {
        await provider.setPet("test123", makePet({ name: "Old Name" }));
        await provider.setPet("test123", makePet({ name: "New Name" }));
        const entry = await provider.getPetEntry("test123");
        if ("pet" in entry) {
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
        if ("pet" in entry) {
          expect(entry.pet.guardians).toHaveLength(2);
          expect(entry.pet.guardians[0]?.name).toBe("Primary");
          expect(entry.pet.guardians[1]?.name).toBe("Secondary");
        }
      });
    });

    describe("reservePetId", () => {
      test("reserves a non-existent ID", async () => {
        expect(await provider.reservePetId("reserved1")).toBe(true);
        const entry = await provider.getPetEntry("reserved1");
        expect(entry.status).toBe("reserved");
      });

      test("reports false when the ID is already taken", async () => {
        expect(await provider.reservePetId("dup1")).toBe(true);
        expect(await provider.reservePetId("dup1")).toBe(false);
        await provider.setPet("dup2", makePet());
        expect(await provider.reservePetId("dup2")).toBe(false);
      });

      test("does not overwrite existing data", async () => {
        await provider.setPet("existing123", makePet({ name: "Existing" }));
        await provider.reservePetId("existing123");
        const entry = await provider.getPetEntry("existing123");
        expect(entry.status).toBe("active");
        if ("pet" in entry) {
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
        await provider.reservePetId("older");
        await provider.reservePetId("newer");

        const entries = await provider.listPetEntries();
        expect(entries.map((e) => e.id)).toEqual(["newer", "older"]);
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
        expect(entry.status).toBe("active");
      });
    });
  });

  describe("LocalPetRepository — full workflow", () => {
    const FACADE_DB_PATH = join(process.cwd(), "data", "facade.test.db.json");

    beforeEach(() => {
      if (existsSync(FACADE_DB_PATH)) rmSync(FACADE_DB_PATH);
      PetRepositoryFactory.reset();
      process.env.DATABASE_PROVIDER = "local";
    });

    afterEach(() => {
      PetRepositoryFactory.reset();
      if (existsSync(FACADE_DB_PATH)) rmSync(FACADE_DB_PATH);
    });

    test("facade delegates to the active provider", async () => {
      const facadeProvider = new LocalPetRepository(FACADE_DB_PATH);

      const missingEntry = await facadeProvider.getPetEntry("nonexistent");
      expect(missingEntry.status).toBe("missing");

      await facadeProvider.reservePetId("reserved");
      expect((await facadeProvider.getPetEntry("reserved")).status).toBe("reserved");

      const pet = makePet({ name: "Facade Test" });
      await facadeProvider.setPet("facade123", pet);
      expect((await facadeProvider.getPetEntry("facade123")).status).toBe("active");

      const ids = await facadeProvider.listPetIds();
      expect(ids).toContain("reserved");
      expect(ids).toContain("facade123");

      const entries = await facadeProvider.listPetEntries();
      expect(entries.length).toBe(2);
    });
  });
});
