import type { IKVSProvider } from "./interface";
import { LocalKVSProvider } from "./local";
import { RedisKVSProvider } from "./redis";

export type DatabaseProviderType = "local" | "redis";

let instance: IKVSProvider | null = null;

export function getDatabaseProvider(): IKVSProvider {
  if (!instance) {
    const type = (process.env.DATABASE_PROVIDER ?? "local") as DatabaseProviderType;
    instance = type === "redis" ? new RedisKVSProvider() : new LocalKVSProvider();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Database] Using ${type} provider`);
    }
  }
  return instance;
}

export function resetDatabaseProvider(): void {
  instance = null;
}

export type { IKVSProvider } from "./interface";
export type { Pet, PetEntry } from "./interface";
