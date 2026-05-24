/**
 * MongoDB implementation of the repository interface.
 *
 * Three collections
 * ─────────────────
 *   pets:
 *     {
 *       _id: hashId,                 // the opaque QR id, used as primary key
 *       status: "reserved" | "active" | "lost",
 *       // when status !== "reserved":
 *       name, pictureUrl, birthdate,
 *       guardianIds: ObjectId[],     // ordered; [0] = primary
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
 *   lostEvents:
 *     {
 *       _id: ObjectId,
 *       petId: hashId,               // FK to pets._id
 *       startedAt: ISO-8601,         // when the pet went missing
 *       endedAt: ISO-8601 | null,    // when found; null while still open
 *       lastSeenLocation?, lastSeenAt?, alerts?,
 *       createdAt, updatedAt,
 *     }
 *
 * Reads of `/view/<hashId>` use $lookup to assemble the full Pet in a single
 * round-trip. Guardians are dedup'd by email on write so a couple with two pets
 * shares one Guardian document — phone-number updates propagate across all
 * their pets without fan-out writes. The current open lost event (if any) is
 * looked up by `(petId, endedAt: null)` and exposed as `pet.lostEvent`. Past
 * resolved events stay in the collection as history.
 *
 * Environment
 * ───────────
 * MONGODB_URI — MongoDB connection string (default: mongodb://localhost:27017/viewpet)
 */

import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import type { Seedable, Pet, PetEntry } from "./interface";
import type { Guardian, LostEvent } from "@/types/pet";

type PetStatus = "reserved" | "active" | "lost";

type PetDoc = {
  _id: string;
  status: PetStatus;
  name?: string;
  pictureUrl?: string;
  birthdate?: string;
  guardianIds?: ObjectId[];
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

type LostEventDoc = {
  _id: ObjectId;
  petId: string;
  startedAt: string;
  endedAt: string | null;
  lastSeenLocation?: string;
  lastSeenAt?: string;
  alerts?: string[];
  createdAt: Date;
  updatedAt: Date;
};

type Collections = {
  pets: Collection<PetDoc>;
  guardians: Collection<GuardianDoc>;
  lostEvents: Collection<LostEventDoc>;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoDbName: string | undefined;
  // eslint-disable-next-line no-var
  var _mongoIndexesPromise: Promise<void> | undefined;
}

/** Exposed for testing — resets the singleton so tests can inject a fresh URI. */
export function resetMongoClient(): void {
  globalThis._mongoClientPromise = undefined;
  globalThis._mongoDbName = undefined;
  globalThis._mongoIndexesPromise = undefined;
}

export class MongoPetRepository implements Seedable {
  private static readonly PETS = "pets";
  private static readonly GUARDIANS = "guardians";
  private static readonly LOST_EVENTS = "lostEvents";

  // ── Private infrastructure ────────────────────────────────────────────────

  private async db(): Promise<Collections> {
    if (!globalThis._mongoClientPromise) {
      const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/viewpet";
      globalThis._mongoDbName = new URL(uri).pathname.slice(1) || "viewpet";
      globalThis._mongoClientPromise = new MongoClient(uri).connect();
    }

    const client = await globalThis._mongoClientPromise;
    const database = client.db(globalThis._mongoDbName ?? "viewpet");

    // Cache the promise so concurrent first-calls share one ensureIndexes run.
    // On rejection the cache is cleared so the next call retries rather than
    // re-throwing the same failed promise for the lifetime of the process.
    if (!globalThis._mongoIndexesPromise) {
      globalThis._mongoIndexesPromise = this.ensureIndexes(database).catch((err) => {
        globalThis._mongoIndexesPromise = undefined;
        throw err;
      });
    }
    await globalThis._mongoIndexesPromise;

    return {
      pets: database.collection<PetDoc>(MongoPetRepository.PETS),
      guardians: database.collection<GuardianDoc>(MongoPetRepository.GUARDIANS),
      lostEvents: database.collection<LostEventDoc>(MongoPetRepository.LOST_EVENTS),
    };
  }

  private async ensureIndexes(database: Db): Promise<void> {
    await database
      .collection<GuardianDoc>(MongoPetRepository.GUARDIANS)
      .createIndex(
        { email: 1 },
        { unique: true, partialFilterExpression: { email: { $type: "string" } } },
      );
    await database
      .collection<PetDoc>(MongoPetRepository.PETS)
      .createIndex({ guardianIds: 1 });
    await database
      .collection<PetDoc>(MongoPetRepository.PETS)
      .createIndex({ status: 1 });
    // Compound index for the "open event for this pet" lookup. The query
    // shape is `{ petId, endedAt: null }`, so petId leads and endedAt
    // follows — that order makes the index usable both for the open-event
    // probe and for "all events for this pet" history queries.
    await database
      .collection<LostEventDoc>(MongoPetRepository.LOST_EVENTS)
      .createIndex({ petId: 1, endedAt: 1 });
  }

  /**
   * Upsert a guardian — by email when present (dedup) or by inserting a fresh
   * document when not. Returns the resulting _id.
   */
  private static async upsertGuardian(
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

  /**
   * Reconcile the lost-event lifecycle for a pet against the new desired state.
   *
   * - status === "lost": ensure there's exactly one open event for this pet.
   *   Updates the existing open event's mutable fields if one is already there;
   *   otherwise inserts a new one. `startedAt` of an open event is never
   *   overwritten — it preserves the original moment the pet went missing.
   * - status === "active": close any open events for this pet by stamping
   *   `endedAt = now`. The documents stay in the collection as history.
   */
  private static async reconcileLostEvent(
    lostEvents: Collection<LostEventDoc>,
    hashId: string,
    pet: Pet,
    now: Date,
  ): Promise<void> {
    if (pet.status === "lost") {
      const input: LostEvent = pet.lostEvent ?? {
        startedAt: now.toISOString(),
        endedAt: null,
      };

      const existing = await lostEvents.findOne({ petId: hashId, endedAt: null });
      const mutableFields = {
        ...(input.lastSeenLocation !== undefined
          ? { lastSeenLocation: input.lastSeenLocation }
          : {}),
        ...(input.lastSeenAt !== undefined ? { lastSeenAt: input.lastSeenAt } : {}),
        ...(input.alerts !== undefined ? { alerts: input.alerts } : {}),
      };

      if (existing) {
        await lostEvents.updateOne(
          { _id: existing._id },
          { $set: { ...mutableFields, updatedAt: now } },
        );
      } else {
        await lostEvents.insertOne({
          _id: new ObjectId(),
          petId: hashId,
          startedAt: input.startedAt,
          endedAt: null,
          ...mutableFields,
          createdAt: now,
          updatedAt: now,
        });
      }
      return;
    }

    // status === "active" → close any open event (preserve history).
    await lostEvents.updateMany(
      { petId: hashId, endedAt: null },
      { $set: { endedAt: now.toISOString(), updatedAt: now } },
    );
  }

  // ── IPetRepository ────────────────────────────────────────────────────────

  async getPetEntry(hashId: string): Promise<PetEntry> {
    const { pets } = await this.db();

    const docs = await pets
      .aggregate<
        PetDoc & {
          guardians?: GuardianDoc[];
          openLostEvents?: LostEventDoc[];
        }
      >([
        { $match: { _id: hashId } },
        {
          $lookup: {
            from: MongoPetRepository.GUARDIANS,
            localField: "guardianIds",
            foreignField: "_id",
            as: "guardians",
          },
        },
        {
          $lookup: {
            from: MongoPetRepository.LOST_EVENTS,
            let: { pid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$petId", "$$pid"] },
                      { $eq: ["$endedAt", null] },
                    ],
                  },
                },
              },
            ],
            as: "openLostEvents",
          },
        },
      ])
      .toArray();

    const doc = docs[0];
    if (!doc) return { status: "missing" };
    if (doc.status === "reserved") return { status: "empty" };
    if (doc.status !== "active" && doc.status !== "lost") return { status: "missing" };

    // Preserve the original order encoded in guardianIds (lookup result is unordered)
    const byId = new Map(
      (doc.guardians ?? []).map((g) => [g._id.toString(), guardianDocToProfile(g)]),
    );
    const guardians = (doc.guardianIds ?? [])
      .map((id) => byId.get(id.toString()))
      .filter((g): g is Guardian => Boolean(g));

    if (!doc.name || !doc.pictureUrl || !doc.birthdate) {
      throw new Error(
        `Pet "${hashId}" has status "${doc.status}" but is missing required fields (name/pictureUrl/birthdate).`,
      );
    }

    const openEvent = doc.openLostEvents?.[0];

    const pet: Pet = {
      name: doc.name,
      pictureUrl: doc.pictureUrl,
      birthdate: doc.birthdate,
      status: doc.status,
      ...(openEvent ? { lostEvent: lostEventDocToEntity(openEvent) } : {}),
      guardians,
    };
    return { status: "filled", pet };
  }

  async setPet(hashId: string, pet: Pet): Promise<void> {
    const { pets, guardians, lostEvents } = await this.db();
    const now = new Date();

    // Read old guardianIds before writing so we can clean up replaced no-email
    // guardians. Email-keyed guardians are shared across pets — never delete them.
    // NOTE: guardian upserts and the pet write are not wrapped in a transaction.
    // If the process dies between steps, email-keyed guardians are idempotent on
    // retry; no-email ones may accumulate until the next successful setPet cleans
    // them up. Wrap in a session/transaction when a replica set is available.
    const oldPetDoc = await pets.findOne({ _id: hashId }, { projection: { guardianIds: 1 } });
    const oldGuardianIds: ObjectId[] = oldPetDoc?.guardianIds ?? [];

    // Deduplicate by email so two guardians with the same email in the input
    // don't produce duplicate _ids in guardianIds (which would cause $lookup
    // to return fewer docs than expected on read).
    const seen = new Set<string>();
    const uniqueGuardians = pet.guardians.filter((g) => {
      if (!g.email) return true;
      if (seen.has(g.email)) return false;
      seen.add(g.email);
      return true;
    });

    const guardianIds: ObjectId[] = [];
    for (const guardian of uniqueGuardians) {
      const id = await MongoPetRepository.upsertGuardian(guardians, guardian, now);
      guardianIds.push(id);
    }

    // Delete no-email guardian docs that are no longer referenced by this pet.
    const newIdSet = new Set(guardianIds.map((id) => id.toString()));
    const orphanIds = oldGuardianIds.filter((id) => !newIdSet.has(id.toString()));
    if (orphanIds.length > 0) {
      await guardians.deleteMany({ _id: { $in: orphanIds }, email: { $exists: false } });
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
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
        // Legacy: clear any embedded `lostInfo` field from the pre-collection
        // schema. Safe to run unconditionally — it's a no-op when the field
        // isn't there. Can be removed once all production docs are migrated.
        $unset: { lostInfo: "" } as Record<string, "">,
      },
      { upsert: true },
    );

    await MongoPetRepository.reconcileLostEvent(lostEvents, hashId, pet, now);
  }

  // ── ISeedable ─────────────────────────────────────────────────────────────

  async reservePetId(hashId: string): Promise<void> {
    const { pets } = await this.db();
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
    const { pets } = await this.db();
    const docs = await pets.find({}, { projection: { _id: 1 } }).toArray();
    return docs.map((d) => d._id);
  }

  async listPetEntries(): Promise<
    Array<{ id: string; status: PetEntry["status"]; name?: string }>
  > {
    const { pets } = await this.db();
    const docs = await pets
      .find({}, { projection: { _id: 1, status: 1, name: 1 } })
      .toArray();
    return docs.map((doc) =>
      doc.status === "reserved"
        ? { id: doc._id, status: "empty" as const }
        : { id: doc._id, status: "filled" as const, ...(doc.name ? { name: doc.name } : {}) },
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

function lostEventDocToEntity(doc: LostEventDoc): LostEvent {
  return {
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    ...(doc.lastSeenLocation !== undefined ? { lastSeenLocation: doc.lastSeenLocation } : {}),
    ...(doc.lastSeenAt !== undefined ? { lastSeenAt: doc.lastSeenAt } : {}),
    ...(doc.alerts !== undefined ? { alerts: doc.alerts } : {}),
  };
}
