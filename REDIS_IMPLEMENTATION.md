# ViewPet - Redis KVS Implementation

This document describes the Redis implementation for the ViewPet project's Key-Value Store.

## Overview

The project has been migrated from a JSON file-based KVS to Redis for better scalability and performance. The public API remains unchanged, maintaining full backward compatibility.

## Architecture

### Redis Client Singleton (`src/lib/redis.ts`)
- Single connection instance shared across the application
- Connection pooling with automatic reconnection
- Exponential backoff retry strategy
- Graceful error handling and logging

### KVS Layer (`src/lib/kvs.ts`)
- Maintains the same public API as the original file-based implementation
- Uses Redis with key pattern: `pet:{hashId}`
- Stores pet data as JSON strings
- Handles three states:
  - **missing**: Key not in Redis (404)
  - **empty**: Key exists with value `"null"` (render form)
  - **filled**: Key contains full Pet JSON (render profile)

## Setup

### 1. Install Dependencies

```bash
bun add redis
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to set your Redis connection URL:

```env
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis

Using Docker:

```bash
docker run -d -p 6379:6379 redis:latest
```

Or using Homebrew (macOS):

```bash
brew install redis
brew services start redis
```

### 4. Seed the Database

Import existing pet data from `pets.json` into Redis:

```bash
bun run seed
```

This will:
- Read all pets from `src/data/pets.json`
- Connect to Redis
- Save each pet with the key pattern `pet:{hashId}`
- Log progress for each pet seeded
- Verify the import

## Available Scripts

- `bun run seed` - Seed Redis with data from pets.json
- `bun run reserve` - Reserve new pet IDs (saves to Redis)
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server

## API Reference

### Public KVS Functions

All functions maintain the same signature as the original file-based implementation:

#### `getPetEntry(hashId: string): Promise<PetEntry>`
Get pet data by hash ID. Returns discriminated union:
- `{ status: "missing" }` - Pet not found
- `{ status: "empty" }` - Pet reserved but not filled
- `{ status: "filled", pet: Pet }` - Complete pet data

#### `setPet(hashId: string, pet: Pet): Promise<void>`
Save or update a pet's data.

#### `reservePetId(hashId: string): Promise<void>`
Reserve a hash ID without data (creates empty entry).

#### `listPetIds(): Promise<string[]>`
Get all registered pet IDs.

#### `listPetEntries(): Promise<Array<{ id: string; status: PetEntry["status"]; name?: string }>>`
Get lightweight summaries of all pets for the landing page.

## Redis Key Schema

### Pattern: `pet:{hashId}`

**Examples:**
```
pet:nuxw4d83wraa -> {"name":"Lupe","picture":"https://...","birthdate":"2018-04-21T18:21:09.372Z","owner":{...}}
pet:n7k8w3zwe49w -> {"name":"Mel",...}
pet:abc123def456 -> "null"  (reserved but empty)
```

## Connection Management

### Singleton Pattern
The Redis client uses a singleton pattern to ensure only one connection is created and reused across the application.

### Retry Strategy
- Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 3s
- Production builds: Max 2 retry attempts (fail fast)
- Development: Max 10 retry attempts

### Error Handling
All Redis operations include:
- Connection error handling
- Automatic reconnection
- Detailed error logging
- Graceful degradation

## Migration from JSON File

The original `pets.json` file is preserved for backup purposes. To migrate:

1. Ensure Redis is running
2. Run the seed script: `bun run seed`
3. Verify data in Redis: `redis-cli KEYS "pet:*"`

## Production Considerations

### Environment Variables
Set `REDIS_URL` in your production environment:

```env
# Example with authentication
REDIS_URL=redis://username:password@redis.example.com:6379

# Example with TLS
REDIS_URL=rediss://redis.example.com:6380
```

### Dynamic Rendering
Pages using Redis are marked with `export const dynamic = "force-dynamic"` to prevent static generation during build:

- `src/app/page.tsx` - Landing page listing all pets
- `src/app/view/[id]/page.tsx` - Individual pet pages

This ensures fresh data from Redis on every request.

### Connection Pooling
The Redis client automatically handles connection pooling. No additional configuration needed.

### Monitoring
Monitor Redis connections in production:

```bash
# Check connection count
redis-cli CLIENT LIST

# Monitor commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory
```

## Troubleshooting

### Build fails with Redis connection error
**Solution**: Ensure pages using Redis have `export const dynamic = "force-dynamic"` to skip static generation.

### Can't connect to Redis
**Solution**: 
1. Check Redis is running: `redis-cli PING` (should return `PONG`)
2. Verify `REDIS_URL` in `.env`
3. Check firewall settings

### Data not persisting
**Solution**: 
1. Check Redis persistence config: `redis-cli CONFIG GET save`
2. Ensure Redis has write permissions to data directory

### Performance issues
**Solution**:
1. Monitor Redis memory: `redis-cli INFO memory`
2. Consider using Redis eviction policies
3. Add indexes if querying patterns change

## Development Tips

### View all keys
```bash
redis-cli KEYS "pet:*"
```

### Get a specific pet
```bash
redis-cli GET "pet:nuxw4d83wraa"
```

### Delete all pets (be careful!)
```bash
redis-cli DEL $(redis-cli KEYS "pet:*")
```

### Monitor Redis commands in real-time
```bash
redis-cli MONITOR
```

## Testing

To test the Redis implementation:

1. Start Redis
2. Run seed script: `bun run seed`
3. Start dev server: `bun run dev`
4. Visit `http://localhost:3000`
5. Test all three states:
   - View filled pet: `/view/nuxw4d83wraa`
   - Create new pet: Reserve ID and fill form
   - Check listing page

## Rollback Plan

If needed, you can temporarily rollback to the JSON file implementation:

1. Keep `src/data/pets.json` as backup
2. Restore original `src/lib/kvs.ts` from git history
3. Remove `src/lib/redis.ts`
4. Uninstall redis: `bun remove redis`

## License

Same as the main ViewPet project.
