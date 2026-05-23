import type { IKVSProvider } from "./interface";
import { LocalKVSProvider } from "./local";
import { MongoDBKVSProvider } from "./mongodb";

export type DatabaseProviderType = "local" | "mongodb";

let instance: IKVSProvider | null = null;

export function getDatabaseProvider(): IKVSProvider {
  if (!instance) {
    const type = (process.env.DATABASE_PROVIDER ??
      "local") as DatabaseProviderType;
    if (type === "mongodb") {
      instance = new MongoDBKVSProvider();
    } else {
      instance = new LocalKVSProvider();
    }
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
export type { PetPublicProfile, PetEntry } from "./interface";
