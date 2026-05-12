# Storage Layer - Quick Reference

## 📂 File Structure
```
src/lib/
├── blobs.ts                    # Facade (backward-compatible API)
└── storage/
    ├── interface.ts            # IStorageProvider + types
    ├── local.ts                # LocalStorageProvider
    ├── s3.ts                   # S3StorageProvider (AWS S3)
    └── index.ts                # Factory + provider selection
```

## 🎯 Quick Start

### Development (Default - No Config)
```bash
bun run dev
# Uses LocalStorageProvider automatically
# Images: public/uploads/
```

### Production (S3 - Recommended)
```bash
# .env.local or environment:
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Optional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net

# Auto-detects S3 in production
NODE_ENV=production
```

## 📝 Usage Examples

### Basic Usage (No Changes Needed)
```typescript
import { savePetImage, SaveImageException } from "@/lib/blobs";

try {
  const url = await savePetImage(hashId, pictureFile);
  // Local: /uploads/abc123.jpg
  // S3: https://bucket.s3.us-east-1.amazonaws.com/uploads/abc123.jpg
  // CloudFront: https://d123456789.cloudfront.net/uploads/abc123.jpg
} catch (err) {
  if (err instanceof SaveImageException) {
    // Handle: empty, invalid_type, too_large
  }
}
```

### Advanced Usage (Direct Provider)
```typescript
import { getStorageProvider } from "@/lib/storage";

const provider = getStorageProvider();
const url = await provider.saveImage(hashId, file);
```

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | Auto-detect | `"local"` or `"s3"` |
| `AWS_REGION` | S3 | `us-east-1` | AWS region |
| `AWS_S3_BUCKET` | S3 | - | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | S3 | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | S3 | - | AWS secret key |
| `AWS_CLOUDFRONT_DOMAIN` | No | - | CloudFront URL (optional) |
| `AWS_S3_PUBLIC_URL` | No | - | Custom S3 URL (optional) |
## 🏗️ Architecture Pattern

```typescript
// Interface (abstraction)
interface IStorageProvider {
  saveImage(hashId: string, file: File): Promise<string>;
}

// Implementations (concrete)
class LocalStorageProvider implements IStorageProvider { ... }
class S3StorageProvider implements IStorageProvider { ... }

// Factory (provider selection)
function getStorageProvider(): IStorageProvider { ... }

// Facade (backward compatibility)
export async function savePetImage(...) {
  const provider = getStorageProvider();
  return provider.saveImage(...);
}
```

## ✅ SOLID Principles

| Principle | How It's Applied |
|-----------|------------------|
| **S**RP | Each provider handles one storage type |
| **O**CP | Add providers without modifying existing code |
| **L**SP | All providers are interchangeable |
| **I**SP | Minimal interface: single `saveImage()` method |
| **D**IP | High-level code depends on `IStorageProvider` interface |

## 🎨 Provider Comparison

| Provider | Storage | URLs | Best For |
|----------|---------|------|----------|
| **Local** | `public/uploads/` | `/uploads/...` | Development, single-server |
| **S3** | AWS S3 | `https://bucket.s3.region.amazonaws.com/...` | Production, cost-effective, CDN |

## 🚀 Adding New Providers

```typescript
// 1. Create provider
export class R2StorageProvider implements IStorageProvider {
  async saveImage(hashId: string, file: File): Promise<string> {
    // Implementation
  }
}

// 2. Add to factory
case "r2":
  storageProviderInstance = new R2StorageProvider();
  break;

// 3. Use it
export STORAGE_PROVIDER=r2
```

**✅ S3 is already implemented!** See `src/lib/storage/s3.ts`

## 🐛 Common Issues

### S3 Not Configured
```
Error: S3 bucket not configured
→ Set AWS_S3_BUCKET environment variable
```

### S3 Access Denied
```
Error: S3 upload failed: Access Denied
→ Check IAM policy includes s3:PutObject
→ Verify AWS credentials are correct
→ See S3_SETUP.md for bucket configuration
```

### File Not Appearing
```
Images not showing in browser
→ Check public/uploads/ exists
→ Restart dev server
→ Clear browser cache
```

## 📚 Documentation

- **S3 Setup:** See `S3_SETUP.md` (comprehensive guide)
- **Detailed Architecture:** See `STORAGE_ARCHITECTURE.md`
- **Implementation:** See `STORAGE_IMPLEMENTATION_SUMMARY.md`
- **Configuration:** See `.env.example`

## 🔗 Key Concepts

**Dependency Inversion** = High-level modules depend on abstractions, not concretions

```
❌ Before: actions.ts → filesystem directly
✅ After:  actions.ts → IStorageProvider ← LocalStorage/S3
```

**Benefits:**
- ✅ Easy to swap storage backends
- ✅ Easy to test (mock providers)
- ✅ Environment-aware
- ✅ Backward compatible

## 💡 Pro Tips

1. **Local Development:** Just run `bun run dev` - no setup needed
2. **Production (S3):** Set AWS env vars - auto-switches (see `S3_SETUP.md`)
3. **CloudFront:** Add `AWS_CLOUDFRONT_DOMAIN` for global CDN
4. **Testing:** Use mock provider implementing `IStorageProvider`
5. **Extending:** New provider? Implement interface, add to factory
6. **Override:** Use `STORAGE_PROVIDER` env var to force specific provider

---

**Quick Command Reference:**
```bash
# Development (local storage)
bun run dev

# Production build (auto-detects S3)
bun run build

# Type check
bun run typecheck

# Force specific provider
STORAGE_PROVIDER=s3 bun run dev
```
