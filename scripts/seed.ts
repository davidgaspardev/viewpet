#!/usr/bin/env bun
/**
 * Seed database with pet data from pets.json.
 *
 * Usage:
 *   bun run seed
 *
 * Respects DATABASE_PROVIDER env var (default: local).
 * Note: DATABASE_PROVIDER=local uses in-memory storage — data is lost
 * when the process exits and won't carry over to the running app.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { getDatabaseProvider } from "../src/lib/database";
import type { PetStore } from "../src/types/pet";

const PETS_JSON_PATH = path.join(process.cwd(), "src/data/pets.json");

const providerType = process.env.DATABASE_PROVIDER ?? "local";

async function main(): Promise<void> {
  console.log(`🌱 Starting seed (provider: ${providerType})...\n`);

  if (providerType === "local") {
    console.log("📁 Writing to local filesystem database (data/local.db.json)\n");
  }

  console.log(`📖 Reading pets from ${PETS_JSON_PATH}...`);
  const rawData = await fs.readFile(PETS_JSON_PATH, "utf8");
  const petsData = JSON.parse(rawData) as PetStore;

  const petIds = Object.keys(petsData);
  console.log(`✅ Found ${petIds.length} pets to seed\n`);

  const provider = getDatabaseProvider();

  let seededCount = 0;
  let skippedCount = 0;

  for (const [hashId, petData] of Object.entries(petsData)) {
    try {
      if (petData === null) {
        await provider.reservePetId(hashId);
        console.log(`🔒 Reserved: ${hashId} (empty slot)`);
      } else {
        await provider.setPet(hashId, petData);
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

  const ids = await provider.listPetIds();
  console.log(`🔍 Verification: Found ${ids.length} pet entries`);
}

main().catch((err) => {
  console.error("\n❌ Seed failed with error:", err);
  process.exit(1);
});
