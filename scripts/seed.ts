#!/usr/bin/env bun
/**
 * Seed database with pet data from pets.json.
 *
 * Usage:
 *   bun run seed           # upsert (preserves existing entries not in pets.json)
 *   bun run seed --reset   # wipe collection/file first, then insert fresh
 *
 * Respects DATABASE_PROVIDER env var (default: local).
 *   local   → writes to data/local.db.json (persists across runs)
 *   mongodb → requires MONGODB_URI
 */

import { promises as fs, writeFileSync } from "node:fs";
import path from "node:path";
import { setPet, reservePetId, listPetIds } from "../src/lib/database";
import type { PetStore } from "../src/types/pet";

const PETS_JSON_PATH = path.join(process.cwd(), "src/data/pets.json");
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "local.db.json");

const providerType = process.env.DATABASE_PROVIDER ?? "local";
const shouldReset = process.argv.includes("--reset");

async function resetProvider(): Promise<void> {
  if (providerType === "local") {
    writeFileSync(LOCAL_DB_PATH, "{}", "utf8");
    console.log("🗑️  Cleared local.db.json\n");
    return;
  }
  console.warn(
    "⚠️  --reset only supported for local provider. Skipping reset.\n",
  );
}

async function main(): Promise<void> {
  console.log(`🌱 Starting seed (provider: ${providerType})...\n`);

  if (shouldReset) await resetProvider();

  if (providerType === "local") {
    console.log(
      "📁 Writing to local filesystem database (data/local.db.json)\n",
    );
  }

  console.log(`📖 Reading pets from ${PETS_JSON_PATH}...`);
  const rawData = await fs.readFile(PETS_JSON_PATH, "utf8");
  const petsData = JSON.parse(rawData) as PetStore;

  const petIds = Object.keys(petsData);
  console.log(`✅ Found ${petIds.length} pets to seed\n`);

  let seededCount = 0;
  let skippedCount = 0;

  for (const [hashId, petData] of Object.entries(petsData)) {
    try {
      if (petData === null) {
        await reservePetId(hashId);
        console.log(`🔒 Reserved: ${hashId} (empty slot)`);
      } else {
        await setPet(hashId, petData);
        console.log(`🐾 Seeded: ${hashId} - ${petData.name}`);
      }
      seededCount++;
    } catch (err) {
      console.error(`❌ Failed to seed ${hashId}:`, err);
      skippedCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Seeding complete!`);
  console.log(`   Total pets: ${petIds.length}`);
  console.log(`   Successfully seeded: ${seededCount}`);
  if (skippedCount > 0) {
    console.log(`   Failed/Skipped: ${skippedCount}`);
  }
  console.log("=".repeat(50) + "\n");

  const ids = await listPetIds();
  console.log(`🔍 Verification: Found ${ids.length} pet entries`);
}

main().catch((err) => {
  console.error("\n❌ Seed failed with error:", err);
  process.exit(1);
});
