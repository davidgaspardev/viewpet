/**
 * MongoDB implementation of the KVS provider interface.
 *
 * Two collections
 * ───────────────
 *   pets:
 *     {
 *       _id: hashId,                 // the opaque QR id, used as primary key
 *       status: "reserved" | "active" | "lost",
 *       // when status !== "reserved":
 *       name, pictureUrl, birthdate,
 *       guardianIds: ObjectId[],     // ordered; [0] = primary
 *       lostInfo?: { since, ... },
 *       createdAt, updatedAt,
 *     }
 *
 *   guardians:
 *     {
 *       _id: ObjectId,
 *       name, email?, phones, social,
 *       createdAt, updatedAt,
 *     }
 *
 * Reads of `/view/<hashId>` use $lookup to assemble the full PetPublicProfile
 * in a single round-trip. Guardians are dedup'd by email on write so a couple
 * with two pets shares one Guardian document — phone-number updates propagate
 * across all their pets without fan-out writes.
 *
 * Environment
 * ───────────
 * MONGODB_URI — MongoDB connection string (default: mongodb://localhost:27017/viewpet)
 */

import { MongoClient, ObjectId, type Collection } from "mongodb";
import type { ISeedable, PetPublicProfile, PetEntry } from "./interface";
import type { Guardian } from "@/types/pet";

const PETS_COLLECTION = "pets";
const GUARDIANS_COLLECTION = "guardians";

type PetStatus = "reserved" | "active" | "lost";

type PetDoc = {
  _id: string;
  status: PetStatus;
  name?: string;
  pictureUrl?: string;
  birthdate?: string;
  guardianIds?: ObjectId[];
  lostInfo?: PetPublicProfile["lostInfo"];
  createdAt: Date;
  updatedAt: Date;
};

type GuardianDoc = {
  _id: ObjectId;
  name: string;
  email?: string;
  phones: Guardian["phones"];
  social: Guardian["social"];
  createdAt: Date;
  updatedAt: Date;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoDbName: string | undefined;
  // eslint-disable-next-line no-var
  var _mongoIndexesEnsured: boolean | undefined;
}

function getClientAndDb(): { promise: Promise<MongoClient>; dbName: string } {
  if (!globalThis._mongoClientPromise) {
    const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/viewpet";
    const dbName = new URL(uri).pathname.slice(1) || "viewpet";
    const client = new MongoClient(uri);
    globalThis._mongoClientPromise = client.connect();
    globalThis._mongoDbName = dbName;
  }
  return {
    promise: globalThis._mongoClientPromise,
    dbName: globalThis._mongoDbName ?? "viewpet",
  };
}

async function db() {
  const { promise, dbName } = getClientAndDb();
  const client = await promise;
  const database = client.db(dbName);

  if (!globalThis._mongoIndexesEnsured) {
    await ensureIndexes(database);
    globalThis._mongoIndexesEnsured = true;
  }

  return {
    pets: database.collection<PetDoc>(PETS_COLLECTION),
    guardians: database.collection<GuardianDoc>(GUARDIANS_COLLECTION),
  };
}

async function ensureIndexes(database: import("mongodb").Db): Promise<void> {
  await database
    .collection<GuardianDoc>(GUARDIANS_COLLECTION)
    .createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: "string" } } },
    );
  await database
    .collection<PetDoc>(PETS_COLLECTION)
    .createIndex({ guardianIds: 1 });
  await database.collection<PetDoc>(PETS_COLLECTION).createIndex({ status: 1 });
}

/** Exposed for testing — resets the singleton so tests can inject a fresh URI. */
export function resetMongoClient(): void {
  globalThis._mongoClientPromise = undefined;
  globalThis._mongoDbName = undefined;
  globalThis._mongoIndexesEnsured = undefined;
}

/**
 * Upsert a guardian — by email when present (dedup) or by inserting a fresh
 * document when not. Returns the resulting _id.
 */
async function upsertGuardian(
  guardians: Collection<GuardianDoc>,
  guardian: Guardian,
  now: Date,
): Promise<ObjectId> {
  if (guardian.email) {
    const result = await guardians.findOneAndUpdate(
      { email: guardian.email },
      {
        $set: {
          name: guardian.name,
          email: guardian.email,
          phones: guardian.phones,
          social: guardian.social,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error("Failed to upsert guardian");
    return result._id;
  }

  // No email → can't dedup. Always insert.
  const insert = await guardians.insertOne({
    _id: new ObjectId(),
    name: guardian.name,
    phones: guardian.phones,
    social: guardian.social,
    createdAt: now,
    updatedAt: now,
  });
  return insert.insertedId;
}

export class MongoDBRepository implements ISeedable {
  async getPetEntry(hashId: string): Promise<PetEntry> {
    const { pets } = await db();

    const docs = await pets
      .aggregate<PetDoc & { guardians?: GuardianDoc[] }>([
        { $match: { _id: hashId } },
        {
          $lookup: {
            from: GUARDIANS_COLLECTION,
            localField: "guardianIds",
            foreignField: "_id",
            as: "guardians",
          },
        },
      ])
      .toArray();

    const doc = docs[0];
    if (!doc) return { status: "missing" };
    if (doc.status === "reserved") return { status: "empty" };

    // Preserve the original order encoded in guardianIds (lookup result is unordered)
    const byId = new Map(
      (doc.guardians ?? []).map((g) => [
        g._id.toString(),
        guardianDocToProfile(g),
      ]),
    );
    const guardians = (doc.guardianIds ?? [])
      .map((id) => byId.get(id.toString()))
      .filter((g): g is Guardian => Boolean(g));

    const pet: PetPublicProfile = {
      name: doc.name ?? "",
      pictureUrl: doc.pictureUrl ?? "",
      birthdate: doc.birthdate ?? "",
      status: doc.status,
      ...(doc.lostInfo ? { lostInfo: doc.lostInfo } : {}),
      guardians,
    };
    return { status: "filled", pet };
  }

  async setPet(hashId: string, pet: PetPublicProfile): Promise<void> {
    const { pets, guardians } = await db();
    const now = new Date();

    const guardianIds: ObjectId[] = [];
    for (const guardian of pet.guardians) {
      const id = await upsertGuardian(guardians, guardian, now);
      guardianIds.push(id);
    }

    await pets.updateOne(
      { _id: hashId },
      {
        $set: {
          status: pet.status,
          name: pet.name,
          pictureUrl: pet.pictureUrl,
          birthdate: pet.birthdate,
          guardianIds,
          ...(pet.lostInfo ? { lostInfo: pet.lostInfo } : {}),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
        ...(pet.lostInfo
          ? {}
          : ({ $unset: { lostInfo: "" } } as Record<string, unknown>)),
      },
      { upsert: true },
    );
  }

  async reservePetId(hashId: string): Promise<void> {
    const { pets } = await db();
    const now = new Date();
    await pets.updateOne(
      { _id: hashId },
      {
        $setOnInsert: {
          _id: hashId,
          status: "reserved" as const,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  async listPetIds(): Promise<string[]> {
    const { pets } = await db();
    const docs = await pets.find({}, { projection: { _id: 1 } }).toArray();
    return docs.map((d) => d._id);
  }

  async listPetEntries(): Promise<
    Array<{ id: string; status: PetEntry["status"]; name?: string }>
  > {
    const { pets } = await db();
    const docs = await pets
      .find({}, { projection: { _id: 1, status: 1, name: 1 } })
      .toArray();
    return docs.map((doc) =>
      doc.status === "reserved"
        ? { id: doc._id, status: "empty" as const }
        : { id: doc._id, status: "filled" as const, name: doc.name ?? "" },
    );
  }
}

function guardianDocToProfile(doc: GuardianDoc): Guardian {
  return {
    name: doc.name,
    ...(doc.email ? { email: doc.email } : {}),
    phones: doc.phones,
    social: doc.social,
  };
}
