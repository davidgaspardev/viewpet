/**
 * Local filesystem provider — flat JSON store used in development and tests.
 *
 * File layout (`data/local.db.json`):
 *
 *   {
 *     "<hashId>": null,           // reserved slot
 *     "<hashId>": { ...Pet },     // registered: active | lost (lostEvent embedded directly)
 *   }
 *
 * This matches the seed file `src/data/pets.json` 1:1 so the seed script just
 * writes pet records through verbatim. There is no separate collection for
 * guardians or lost events here — that complexity only pays off with a real
 * database (see mongodb.ts), and adding it locally only makes the test
 * fixtures harder to read.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Seedable, Pet, PetEntry, PetEntrySummary } from "./interface";
import { isRegisteredStatus, type PetStore } from "@/types/pet";

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
    if (value === null) return { status: "reserved" };
    // An unrecognised status is never published (see isRegisteredStatus).
    if (!isRegisteredStatus(value.status)) return { status: "missing" };
    return { status: value.status, pet: value };
  }

  async setPet(hashId: string, pet: Pet): Promise<void> {
    const data = this.read();
    data[hashId] = pet;
    this.write(data);
  }

  async reservePetId(hashId: string): Promise<boolean> {
    const data = this.read();
    if (hashId in data) return false;
    data[hashId] = null;
    this.write(data);
    return true;
  }

  async listPetIds(): Promise<string[]> {
    return Object.keys(this.read());
  }

  async listPetEntries(): Promise<PetEntrySummary> {
    // The JSON store keeps no timestamps; object order is insertion order (a
    // hashId is 12 chars, so it never counts as an integer-like key), so
    // reversing it gives the same "newest first" the Mongo provider returns.
    const entries: PetEntrySummary = [];
    for (const [id, value] of Object.entries(this.read())) {
      if (value === null) entries.push({ id, status: "reserved" });
      else if (isRegisteredStatus(value.status)) entries.push({ id, status: value.status, name: value.name });
      else console.warn(`[Repository] Skipping "${id}": unrecognised status ${JSON.stringify(value.status)}`);
    }
    return entries.reverse();
  }

  clear(): void {
    this.write({});
  }

  size(): number {
    return Object.keys(this.read()).length;
  }
}
