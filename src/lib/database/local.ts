import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { IKVSProvider, PetPublicProfile, PetEntry } from "./interface";

const DEFAULT_PATH = join(process.cwd(), "data", "local.db.json");

export class LocalKVSProvider implements IKVSProvider {
  private readonly dbPath: string;

  constructor(dbPath = DEFAULT_PATH) {
    this.dbPath = dbPath;
    mkdirSync(dirname(dbPath), { recursive: true });
    if (!existsSync(dbPath)) writeFileSync(dbPath, "{}", "utf8");
  }

  private read(): Record<string, PetPublicProfile | null> {
    try {
      return JSON.parse(readFileSync(this.dbPath, "utf8"));
    } catch {
      return {};
    }
  }

  private write(data: Record<string, PetPublicProfile | null>): void {
    writeFileSync(this.dbPath, JSON.stringify(data, null, 2), "utf8");
  }

  async getPetEntry(hashId: string): Promise<PetEntry> {
    const data = this.read();
    if (!(hashId in data)) return { status: "missing" };
    if (data[hashId] === null) return { status: "empty" };
    return { status: "filled", pet: data[hashId] as PetPublicProfile };
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
