#!/usr/bin/env bun
/**
 * Seed Redis with pet data from pets.json.
 *
 * Usage:
 *   bun run seed
 *
 * This script:
 * 1. Reads all pets from src/data/pets.json
 * 2. Connects to Redis
 * 3. Saves each pet to Redis with the key pattern `pet:{hashId}`
 * 4. Logs progress for each pet seeded
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { getRedisClient, closeRedisClient } from "../src/lib/redis";
import type { PetStore } from "../src/types/pet";

const PETS_JSON_PATH = path.join(process.cwd(), "src/data/pets.json");

async function main(): Promise<void> {
  console.log("🌱 Starting Redis seed...\n");

  // Read pets.json
  console.log(`📖 Reading pets from ${PETS_JSON_PATH}...`);
  const rawData = await fs.readFile(PETS_JSON_PATH, "utf8");
  const petsData = JSON.parse(rawData) as PetStore;

  const petIds = Object.keys(petsData);
  console.log(`✅ Found ${petIds.length} pets to seed\n`);

  // Connect to Redis
  console.log("🔌 Connecting to Redis...");
  const redis = await getRedisClient();
  console.log("✅ Connected to Redis\n");

  // Seed each pet
  let seededCount = 0;
  let skippedCount = 0;

  for (const [hashId, petData] of Object.entries(petsData)) {
    const key = `pet:${hashId}`;

    try {
      if (petData === null) {
        // Handle reserved but empty pets
        await redis.set(key, "null");
        console.log(`🔒 Reserved: ${hashId} (empty slot)`);
        seededCount++;
      } else {
        // Save pet with full data
        const value = JSON.stringify(petData);
        await redis.set(key, value);
        console.log(`🐾 Seeded: ${hashId} - ${petData.name}`);
        seededCount++;
      }
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

  // Verify by listing all keys
  const keys = await redis.keys("pet:*");
  console.log(`🔍 Verification: Found ${keys.length} pet keys in Redis`);

  // Close connection
  await closeRedisClient();
}

main().catch((err) => {
  console.error("\n❌ Seed failed with error:", err);
  process.exit(1);
});
