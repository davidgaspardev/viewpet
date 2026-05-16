/**
 * MongoDB implementation of the KVS provider interface.
 *
 * Collection: `pets`
 *
 * Document schema
 * ───────────────
 * Reserved slot (entry exists, no pet data yet):
 *   { _id: hashId, status: "reserved" }
 *
 * Active pet profile:
 *   { _id: hashId, status: "active", name, pictureUrl, birthdate, guardian, ... }
 *
 * Lost pet (future):
 *   { _id: hashId, status: "lost", ..., lostInfo: { since, ... } }
 *
 * The `status` field is the single discriminator. "reserved" maps to the
 * `empty` KVS state; "active" / "lost" map to `filled`.
 *
 * Environment
 * ───────────
 * MONGODB_URI — MongoDB connection string (default: mongodb://localhost:27017/viewpet)
 */

import { MongoClient, type Collection, type Db } from "mongodb";
import type { IKVSProvider, PetPublicProfile, PetEntry } from "./interface";

const COLLECTION = "pets";

type ReservedDocument = { _id: string; status: "reserved" };
type FilledDocument = { _id: string } & PetPublicProfile;
type PetDocument = ReservedDocument | FilledDocument;

let client: MongoClient | null = null;
let db: Db | null = null;

async function getCollection(): Promise<Collection<PetDocument>> {
  if (!client) {
    const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/viewpet";
    client = new MongoClient(uri);
    await client.connect();
    const dbName = new URL(uri).pathname.slice(1) || "viewpet";
    db = client.db(dbName);
  }
  return db!.collection<PetDocument>(COLLECTION);
}

/** Exposed for testing — resets the singleton so tests can inject a fresh URI. */
export function resetMongoClient(): void {
  client = null;
  db = null;
}

export class MongoDBKVSProvider implements IKVSProvider {
  async getPetEntry(hashId: string): Promise<PetEntry> {
    const col = await getCollection();
    const doc = await col.findOne({ _id: hashId });

    if (!doc) return { status: "missing" };
    if (doc.status === "reserved") return { status: "empty" };

    const { _id, ...pet } = doc as FilledDocument;
    void _id;
    return { status: "filled", pet };
  }

  async setPet(hashId: string, pet: PetPublicProfile): Promise<void> {
    const col = await getCollection();
    await col.replaceOne(
      { _id: hashId },
      { _id: hashId, ...pet } as unknown as PetDocument,
      { upsert: true },
    );
  }

  async reservePetId(hashId: string): Promise<void> {
    const col = await getCollection();
    await col.updateOne(
      { _id: hashId },
      { $setOnInsert: { _id: hashId, status: "reserved" } as ReservedDocument },
      { upsert: true },
    );
  }

  async listPetIds(): Promise<string[]> {
    const col = await getCollection();
    const docs = await col.find({}, { projection: { _id: 1 } }).toArray();
    return docs.map((d) => d._id);
  }

  async listPetEntries(): Promise<
    Array<{ id: string; status: PetEntry["status"]; name?: string }>
  > {
    const col = await getCollection();
    const docs = await col
      .find({}, { projection: { _id: 1, status: 1, name: 1 } })
      .toArray();
    return docs.map((doc) =>
      doc.status === "reserved"
        ? { id: doc._id, status: "empty" as const }
        : { id: doc._id, status: "filled" as const, name: (doc as FilledDocument).name },
    );
  }
}
