#!/usr/bin/env bun
/**
 * Batch-reserve hashIds in the mock KVS.
 *
 * Usage:
 *   bun run reserve                # reserves 1 ID
 *   bun run reserve --count 50     # reserves 50 IDs
 *   bun run reserve -n 50          # short flag
 *
 * Each reserved ID is printed to stdout, one per line, ready to be piped
 * into a QR-code generator pipeline:
 *
 *   bun run reserve -n 100 > qr-batch.txt
 */
import { generateHashId } from "../src/lib/utils/ids";
import { PetRepositoryFactory } from "../src/lib/repository";
import { reserveFreshId } from "../src/features/admin/reserve";

function parseArgs(argv: string[]): { count: number } {
  const args = argv.slice(2);
  let count = 1;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--count" || arg === "-n") {
      const next = args[i + 1];
      const parsed = Number(next);
      if (!Number.isInteger(parsed) || parsed < 1) {
        console.error(`Invalid value for ${arg}: ${next}`);
        process.exit(1);
      }
      count = parsed;
      i++;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: bun run reserve [--count N]\n\n" +
          "  --count, -n  Number of IDs to reserve (default 1)\n" +
          "  --help, -h   Show this help",
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return { count };
}

async function main(): Promise<void> {
  const { count } = parseArgs(process.argv);
  const repository = PetRepositoryFactory.getInstance();
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = await reserveFreshId(repository, generateHashId);
    if (!id) {
      // Print what was reserved so far so those ids aren't lost.
      for (const reserved of ids) console.log(reserved);
      console.error(`\nCould not reserve a free id after ${ids.length}/${count}. Aborting.`);
      process.exit(1);
    }
    ids.push(id);
  }
  for (const id of ids) console.log(id);
  console.error(`\nReserved ${count} ID(s). Open /tag/<id> to fill them in.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
