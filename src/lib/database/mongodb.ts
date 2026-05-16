/**
 * MongoDB implementation of the KVS provider interface.
 *
 * Collection: `pets`
 * Document shape:
 *   - { _id: hashId, empty: true }               → reserved, no data yet
 *   - { _id: hashId, ...PetPublicProfile fields } → fully filled record
 *
 * Three states:
 *   - "missing": document not found               (→ 404)
 *   - "empty"  : document has `empty: true`       (→ render form)
 *   - "filled" : document has pet data            (→ render profile)
 *
 * Set MONGODB_URI in the environment to connect.
 * Defaults to mongodb://localhost:27017/viewpet.
 */

import { MongoClient, type Collection, type Db, type WithId } from "mongodb";
import type { IKVSProvider, PetPublicProfile, PetEntry } from "./interface";

const COLLECTION = "pets";

/** Stored shape — _id is the hashId. */
type PetDocument = { _id: string } & (
  | { empty: true }
  | ({ empty?: never } & PetPublicProfile)
);

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

export class MongoDBKVSProvider implements IKVSProvider {
  async getPetEntry(hashId: string): Promise<PetEntry> {
    const col = await getCollection();
    const doc = await col.findOne({ _id: hashId });

    if (!doc) return { status: "missing" };
    if ("empty" in doc && doc.empty) return { status: "empty" };

    const { _id, empty: _empty, ...pet } = doc as WithId<PetDocument> & Record<string, unknown>;
    void _id; void _empty;
    return { status: "filled", pet: pet as PetPublicProfile };
  }

  async setPet(hashId: string, pet: PetPublicProfile): Promise<void> {
    const col = await getCollection();
    // replaceOne expects WithoutId<T>; _id comes from the filter on upsert
    await col.replaceOne(
      { _id: hashId },
      pet as unknown as PetDocument,
      { upsert: true },
    );
  }

  async reservePetId(hashId: string): Promise<void> {
    const col = await getCollection();
    await col.updateOne(
      { _id: hashId },
      { $setOnInsert: { _id: hashId, empty: true as const } },
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
      .find({}, { projection: { _id: 1, empty: 1, name: 1 } })
      .toArray();
    return docs.map((doc) => {
      if ("empty" in doc && doc.empty) {
        return { id: doc._id, status: "empty" as const };
      }
      const filled = doc as { _id: string; name?: string };
      return { id: filled._id, status: "filled" as const, name: filled.name };
    });
  }
}
