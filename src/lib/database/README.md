# KVS Layer Refactoring - Dependency Inversion Pattern

This directory implements the key-value store (KVS) layer using dependency inversion, following the same pattern as the storage layer.

## Architecture

```
src/lib/database/
├── interface.ts    # IKVSProvider interface + types
├── redis.ts        # RedisKVSProvider implementation
├── memory.ts       # MemoryKVSProvider implementation
└── index.ts        # Factory with auto-detection
```

## Benefits

✅ **Dependency Inversion** - High-level code depends on `IKVSProvider` interface, not concrete implementations  
✅ **Easy Testing** - Use `MemoryKVSProvider` for tests without external dependencies  
✅ **Pluggable Backends** - Easy to add DynamoDB, SQLite, Postgres, etc.  
✅ **Backward Compatible** - `src/lib/kvs.ts` facade maintains existing API  
✅ **Consistent Architecture** - Matches storage layer pattern  

## Provider Selection

The factory (`getKVSProvider()`) auto-detects which provider to use:

1. **Explicit override**: `KVS_PROVIDER` env var (`redis` | `memory`)
2. **Test environment**: Always uses `memory` (fast, no setup)
3. **Redis configured**: Uses `redis` if `REDIS_URL` is set
4. **Default**: Falls back to `memory` (safe, no persistence)

## Environment Variables

```bash
# Explicit provider selection (optional)
KVS_PROVIDER=redis  # or "memory"

# Redis configuration (required for redis provider)
REDIS_URL=redis://localhost:6379

# Auto-detection works without KVS_PROVIDER:
# - NODE_ENV=test → memory
# - REDIS_URL set → redis
# - Otherwise → memory (with warning)
```

## Usage

### Direct Provider Usage (Recommended)

```typescript
import { getKVSProvider } from "@/lib/database";

const provider = getKVSProvider();
const entry = await provider.getPetEntry("abc123");
```

### Backward-Compatible Facade

```typescript
import { getPetEntry, setPet } from "@/lib/kvs";

const entry = await getPetEntry("abc123");
await setPet("abc123", petData);
```

## Interface: IKVSProvider

All providers implement this interface:

```typescript
interface IKVSProvider {
  // Three-state retrieval: missing, empty (reserved), filled
  getPetEntry(hashId: string): Promise<PetEntry>;
  
  // Save complete pet record
  setPet(hashId: string, pet: Pet): Promise<void>;
  
  // Reserve ID without data (for empty state)
  reservePetId(hashId: string): Promise<void>;
  
  // List all registered IDs
  listPetIds(): Promise<string[]>;
  
  // Get lightweight summaries (for landing page)
  listPetEntries(): Promise<Array<{
    id: string;
    status: PetEntry["status"];
    name?: string;
  }>>;
}
```

## Three-State System

The KVS layer maintains three distinct states:

| State | Description | Use Case |
|-------|-------------|----------|
| `missing` | Key not registered | Return 404 |
| `empty` | Key reserved with null value | Render registration form |
| `filled` | Key contains full Pet data | Render pet profile |

## Implementations

### RedisKVSProvider

**Storage Pattern:**
- Keys: `pet:{hashId}`
- Values: JSON-stringified `Pet` or `"null"` for reservations
- Same logic as original `kvs.ts`

**Usage:**
```bash
KVS_PROVIDER=redis
REDIS_URL=redis://localhost:6379
```

### MemoryKVSProvider

**Storage:** In-memory `Map<string, Pet | null>`  
**Persistence:** None (resets on restart)  
**Use Cases:**
- Unit tests (no external dependencies)
- Local development without Redis
- CI/CD pipelines

**Extra methods for testing:**
```typescript
const provider = new MemoryKVSProvider();
provider.clear();        // Reset all data
provider.size();         // Get entry count
```

## Testing

Tests use `MemoryKVSProvider` automatically in `NODE_ENV=test`:

```typescript
import { getKVSProvider, resetKVSProvider } from "@/lib/database";

describe("My Test", () => {
  beforeEach(() => {
    resetKVSProvider();  // Reset singleton
  });
  
  test("something", async () => {
    const provider = getKVSProvider();  // Gets MemoryKVSProvider
    await provider.setPet("test123", petData);
    // ...
  });
});
```

Run tests:
```bash
bun test src/lib/__tests__/database.test.ts
```

## Adding New Providers

### Example: DynamoDBKVSProvider

1. **Create implementation:**

```typescript
// src/lib/database/dynamodb.ts
import type { IKVSProvider, Pet, PetEntry } from "./interface";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export class DynamoDBKVSProvider implements IKVSProvider {
  private client: DynamoDBClient;
  private tableName: string;
  
  constructor() {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.tableName = process.env.DYNAMODB_TABLE!;
  }
  
  async getPetEntry(hashId: string): Promise<PetEntry> {
    // Implementation...
  }
  
  // Implement other interface methods...
}
```

2. **Update factory:**

```typescript
// src/lib/database/index.ts
import { DynamoDBKVSProvider } from "./dynamodb";

export type DatabaseProviderType = "redis" | "memory" | "dynamodb";

function determineProviderType(): DatabaseProviderType {
  const explicit = process.env.KVS_PROVIDER?.toLowerCase();
  if (explicit === "dynamodb") return "dynamodb";
  // ... rest of logic
}

export function getKVSProvider(): IKVSProvider {
  // ... existing logic
  switch (providerType) {
    case "dynamodb":
      kvsProviderInstance = new DynamoDBKVSProvider();
      break;
    // ... existing cases
  }
  // ...
}
```

3. **Use it:**

```bash
KVS_PROVIDER=dynamodb
DYNAMODB_TABLE=viewpet-pets
AWS_REGION=us-east-1
```

## Migration from Original kvs.ts

**No breaking changes!** The refactoring maintains 100% backward compatibility:

### Before (Direct Redis)
```typescript
import { getPetEntry } from "@/lib/kvs";
const entry = await getPetEntry("abc123");
```

### After (Same API)
```typescript
import { getPetEntry } from "@/lib/kvs";
const entry = await getPetEntry("abc123");  // Works identically
```

The facade delegates to the appropriate provider automatically.

## Redis Server Setup

### Option A: Docker Compose (recommended)

```bash
docker-compose up -d        # start in background
docker-compose ps           # verify running
docker-compose logs -f redis
docker-compose down         # stop
```

### Option B: Docker (standalone)

```bash
docker run -d --name viewpet-redis -p 6379:6379 redis:7-alpine
```

### Option C: Homebrew (macOS)

```bash
brew install redis
brew services start redis
redis-cli ping  # → PONG
```

### Environment

```bash
# .env.local (default works with any of the above)
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://:password@localhost:6379

# Production TLS
REDIS_URL=rediss://username:password@your-host:6380
```

## Data Seeding

Import existing pets from `src/data/pets.json` into Redis:

```bash
bun run seed
```

Verify:

```bash
redis-cli KEYS "pet:*"         # list all pet keys
redis-cli GET "pet:nuxw4d83wraa"  # inspect a specific pet
redis-cli DBSIZE               # total key count
```

Re-seed from scratch:

```bash
redis-cli FLUSHDB && bun run seed
# or: docker-compose down -v && docker-compose up -d && bun run seed
```

## Redis Key Schema

```
Key pattern:  pet:{hashId}
Value:        JSON string (filled pet) | "null" (reserved) | <missing> (404)
```

Examples:

```
pet:nuxw4d83wraa → {"name":"Lupe","picture":"https://...","birthdate":"...","owner":{...}}
pet:abc123def456 → "null"   (reserved, awaiting form submission)
```

## Connection Management

The Redis client (`src/lib/redis.ts`) uses a singleton with:

- **Retry strategy**: exponential backoff — 50 ms → 100 ms → 200 ms → max 3 s
- **Max attempts**: 2 in production (fail fast), 10 in development
- **Reconnection**: automatic on disconnect
- **Dynamic rendering**: pages reading Redis use `export const dynamic = "force-dynamic"` to prevent static generation at build time

### Recommended Redis Providers (production)

- **Upstash** — serverless HTTP-based Redis
- **Redis Cloud** — managed by Redis Labs
- **AWS ElastiCache** — Redis on AWS
- **Railway / Render** — simple managed Redis

## Manual Testing Scenarios

```bash
# Create an empty reservation
redis-cli SET pet:test-empty "null"
# → http://localhost:3000/view/test-empty should show the form

# Create a filled pet
redis-cli SET pet:test-filled '{"name":"Test","picture":"https://example.com/pic.jpg","birthdate":"2020-01-01T00:00:00.000Z","owner":{"name":"Owner","email":"a@b.com","phone":"123"}}'
# → http://localhost:3000/view/test-filled should show profile

# Test 404
redis-cli DEL pet:test-missing
# → http://localhost:3000/view/test-missing should show "not found"
```

## Production Checklist

- [ ] Set `KVS_PROVIDER=redis` (or let auto-detection work via `REDIS_URL`)
- [ ] Configure `REDIS_URL` with production Redis instance
- [ ] Run seed if migrating from JSON: `bun run seed`
- [ ] Verify build: `bun run build`
- [ ] Run tests: `bun test`
- [ ] Monitor provider logs: `[KVS] Using redis provider`

## Troubleshooting

**"Falling back to in-memory storage" warning**
→ Set `REDIS_URL` or set `KVS_PROVIDER=memory` explicitly if intentional

**Tests failing with Redis connection errors**
→ Ensure `NODE_ENV=test` — tests should auto-select `MemoryKVSProvider`

**Data not persisting between requests**
→ You are using `memory` provider; set `REDIS_URL` to switch to `redis`

**`ECONNREFUSED` — can't connect to Redis**
```bash
redis-cli ping              # should return PONG
docker-compose restart redis
docker-compose logs redis
```

**Build fails with Redis connection error**
→ Pages reading Redis must have `export const dynamic = "force-dynamic"`

**Seed script fails**
```bash
redis-cli ping              # verify Redis is reachable
cat src/data/pets.json      # verify data file exists
REDIS_URL=redis://localhost:6379 bun run seed
```

## Related Files

- `src/lib/kvs.ts` — backward-compatible facade
- `src/lib/redis.ts` — Redis client singleton
- `src/lib/storage/` — Storage layer (same pattern)
- `src/lib/__tests__/database.test.ts` — test suite
- `scripts/seed.ts` — seed script
