# Redis Setup Guide

This project uses **Redis** as the Key-Value Store (KVS) for pet data.

## Quick Start

### 1. Start Redis

**Option A: Using Docker Compose (Recommended)**
```bash
# Start Redis in the background
docker-compose up -d

# Check Redis is running
docker-compose ps

# View Redis logs
docker-compose logs -f redis

# Stop Redis
docker-compose down
```

**Option B: Using Docker directly**
```bash
docker run -d \
  --name viewpet-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option C: Local Redis installation**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Verify
redis-cli ping  # Should return "PONG"
```

### 2. Configure Environment (Optional)

Create a `.env.local` file if you need custom Redis configuration:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Local Redis (default)
REDIS_URL=redis://localhost:6379

# Or with password
REDIS_URL=redis://:password@localhost:6379

# Or remote Redis (Upstash, Redis Cloud, etc.)
REDIS_URL=redis://username:password@your-redis-host:6379
```

### 3. Seed the Database

Load all pets from `src/data/pets.json` into Redis:

```bash
bun run seed
```

Expected output:
```
🌱 Starting Redis seed...

📖 Reading pets from /path/to/pets.json...
✅ Found 7 pets to seed

🔌 Connecting to Redis...
✅ Connected to Redis

🐾 Seeded: nuxw4d83wraa - Lupe
🐾 Seeded: n7k8w3zwe49w - Mel
🐾 Seeded: egqr8k6at59j - Thor
🐾 Seeded: ujvb9gd7afsx - Bob
🐾 Seeded: 8p6qt38gj7be - Luna
🐾 Seeded: vcjv2sx3s5bd - Scooby
🐾 Seeded: 6pb46abtj58e - Mel

==================================================
✅ Seeding complete!
   Total pets: 7
   Successfully seeded: 7
==================================================

🔍 Verification: Found 7 pet keys in Redis
```

### 4. Run the Application

```bash
# Development
bun run dev

# Production build
bun run build
bun run start
```

## Redis Key Structure

All pet data is stored with the following pattern:

```
Key Pattern: pet:{hashId}
```

Examples:
- `pet:nuxw4d83wraa` → Full pet data (JSON string)
- `pet:abc123` → `"null"` (reserved but empty)

### Data States

1. **Missing** - Key doesn't exist → 404 Not Found
2. **Empty** - Key exists with value `"null"` → Show form
3. **Filled** - Key exists with JSON pet data → Show profile

## Useful Redis Commands

### Verify Data

```bash
# Enter Redis CLI
redis-cli

# List all pet keys
KEYS pet:*

# Get a specific pet
GET pet:nuxw4d83wraa

# Count total pets
DBSIZE

# Check if key exists
EXISTS pet:nuxw4d83wraa

# Delete a pet (careful!)
DEL pet:abc123

# Flush all data (VERY CAREFUL!)
FLUSHDB
```

### Monitor Redis

```bash
# Watch commands in real-time
redis-cli MONITOR

# Get Redis info
redis-cli INFO

# Check memory usage
redis-cli INFO memory
```

## Production Deployment

### Recommended Redis Providers

1. **[Upstash](https://upstash.com/)** - Serverless Redis with HTTP API
2. **[Redis Cloud](https://redis.com/redis-enterprise-cloud/)** - Managed Redis by Redis Labs
3. **[AWS ElastiCache](https://aws.amazon.com/elasticache/)** - Redis on AWS
4. **[Railway](https://railway.app/)** - Simple Redis hosting
5. **[Render](https://render.com/)** - Managed Redis

### Environment Variables

Set these in your hosting platform:

```env
REDIS_URL=redis://username:password@your-host:port
```

For TLS connections (recommended for production):
```env
REDIS_URL=rediss://username:password@your-host:port
```

### Connection Pooling

The Redis client automatically handles:
- ✅ Connection pooling (singleton pattern)
- ✅ Automatic reconnection with exponential backoff
- ✅ Error handling and logging
- ✅ Graceful degradation

## Troubleshooting

### "ECONNREFUSED" Error

**Problem:** Can't connect to Redis

**Solutions:**
```bash
# Check if Redis is running
docker ps | grep redis
# or
redis-cli ping

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

### "Max reconnection attempts reached"

**Problem:** Redis is down or unreachable

**Solutions:**
1. Verify `REDIS_URL` is correct in `.env.local`
2. Check network connectivity
3. Verify Redis credentials
4. Check firewall rules

### Seed Script Fails

**Problem:** Seed script errors out

**Solutions:**
```bash
# Ensure Redis is running
redis-cli ping

# Check Redis logs
docker-compose logs redis

# Verify pets.json exists
cat src/data/pets.json

# Run with verbose logging
REDIS_URL=redis://localhost:6379 bun run seed
```

## Development Tips

### Re-seeding

To re-seed from scratch:

```bash
# Method 1: Flush and re-seed
redis-cli FLUSHDB
bun run seed

# Method 2: Restart Redis container
docker-compose down -v  # Remove volumes
docker-compose up -d
bun run seed
```

### Testing Different Scenarios

```bash
# Create an empty reservation
redis-cli SET pet:test123 "null"

# Create a filled pet
redis-cli SET pet:test456 '{"name":"Test","picture":"...","birthdate":"...","owner":{...}}'

# Test in browser
open http://localhost:3000/view/test123  # Should show form
open http://localhost:3000/view/test456  # Should show profile
```

## Migration from JSON File

The old JSON file (`src/data/pets.json`) is preserved as a backup. To migrate:

1. ✅ Redis implementation already done
2. ✅ Seed script reads from `pets.json`
3. ✅ Run `bun run seed` to import data
4. ✅ Old file kept as backup/reference

## Rollback to JSON File

If you need to rollback to the JSON file-based KVS:

1. Replace `src/lib/kvs.ts` with the old implementation
2. Remove Redis dependencies
3. Application works as before

The backup file is preserved for this purpose.

## Architecture

```
┌─────────────────┐
│   Next.js App   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   src/lib/kvs   │  ← Public API (unchanged)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  src/lib/redis  │  ← Singleton client
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Redis Server   │  ← Docker / Cloud
└─────────────────┘
```

## Support

For issues or questions:
1. Check this guide
2. Review `REDIS_IMPLEMENTATION.md` for technical details
3. Check Redis logs: `docker-compose logs redis`
4. Open an issue on GitHub
