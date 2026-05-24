/**
 * Local filesystem provider — flat JSON store used in development and tests.
 *
 * File layout (`data/local.db.json`):
 *
 *   {
 *     "<hashId>": null,                    // reserved slot
 *     "<hashId>": { ...PetPublicProfile }, // filled
 *   }
 *
 * This matches the seed file `src/data/pets.json` 1:1 so the seed script just
 * writes pet records through verbatim. There is no two-collection split here —
 * that complexity only pays off with a real database (see mongodb.ts), and
 * adding it locally only makes the test fixtures harder to read.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Seedable, PetPublicProfile, PetEntry } from "./interface";
import type { PetStore } from "@/types/pet";

const DEFAULT_PATH = join(process.cwd(), "data", "local.db.json");

export class LocalPetRepository implements Seedable {
  private readonly dbPath: string;

  constructor(dbPath = DEFAULT_PATH) {
    this.dbPath = dbPath;
  }

  private read(): PetStore {
    try {
      return JSON.parse(readFileSync(this.dbPath, "utf8")) as PetStore;
    } catch {
      return {};
    }
  }

  private write(data: PetStore): void {
    mkdirSync(dirname(this.dbPath), { recursive: true });
    writeFileSync(this.dbPath, JSON.stringify(data, null, 2), "utf8");
  }

  async getPetEntry(hashId: string): Promise<PetEntry> {
    const data = this.read();
    if (!(hashId in data)) return { status: "missing" };
    const value = data[hashId];
    if (value === null) return { status: "empty" };
    return { status: "filled", pet: value };
  }

  async setPet(hashId: string, pet: PetPublicProfile): Promise<void> {
    const data = this.read();
    data[hashId] = pet;
    this.write(data);
  }

  async reservePetId(hashId: string): Promise<void> {
    const data = this.read();
    if (!(hashId in data)) {
      data[hashId] = null;
      this.write(data);
    }
  }

  async listPetIds(): Promise<string[]> {
    return Object.keys(this.read());
  }

  async listPetEntries(): Promise<
    Array<{ id: string; status: PetEntry["status"]; name?: string }>
  > {
    return Object.entries(this.read()).map(([id, value]) =>
      value === null
        ? { id, status: "empty" }
        : { id, status: "filled", name: value.name },
    );
  }

  clear(): void {
    this.write({});
  }

  size(): number {
    return Object.keys(this.read()).length;
  }
}
