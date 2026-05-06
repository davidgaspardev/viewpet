# Storage Layer - Quick Reference

## 📂 File Structure
```
src/lib/
├── blobs.ts                    # Facade (backward-compatible API)
└── storage/
    ├── interface.ts            # IStorageProvider + types
    ├── local.ts                # LocalStorageProvider
    ├── firebase.ts             # FirebaseStorageProvider
    └── index.ts                # Factory + provider selection
```

## 🎯 Quick Start

### Development (Default - No Config)
```bash
bun run dev
# Uses LocalStorageProvider automatically
# Images: public/uploads/
```

### Production (Firebase)
```bash
# .env.local or environment:
FIREBASE_STORAGE_BUCKET=your-app.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Auto-detects Firebase in production
NODE_ENV=production
```

## 📝 Usage Examples

### Basic Usage (No Changes Needed)
```typescript
import { savePetImage, SaveImageException } from "@/lib/blobs";

try {
  const url = await savePetImage(hashId, pictureFile);
  // Local: /uploads/abc123.jpg
  // Firebase: https://storage.googleapis.com/.../uploads/abc123.jpg
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
| `STORAGE_PROVIDER` | No | Auto-detect | `"local"` or `"firebase"` |
| `FIREBASE_STORAGE_BUCKET` | Production | - | Firebase bucket name |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Production* | - | Service account JSON |

*Or use Application Default Credentials in GCP

## 🏗️ Architecture Pattern

```typescript
// Interface (abstraction)
interface IStorageProvider {
  saveImage(hashId: string, file: File): Promise<string>;
}

// Implementations (concrete)
class LocalStorageProvider implements IStorageProvider { ... }
class FirebaseStorageProvider implements IStorageProvider { ... }

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
| **Firebase** | Firebase Storage | `https://storage.googleapis.com/...` | Production, multi-server, CDN |

## 🚀 Adding New Providers

```typescript
// 1. Create provider
export class S3StorageProvider implements IStorageProvider {
  async saveImage(hashId: string, file: File): Promise<string> {
    // Implementation
  }
}

// 2. Add to factory
case "s3":
  storageProviderInstance = new S3StorageProvider();
  break;

// 3. Use it
export STORAGE_PROVIDER=s3
```

## 🐛 Common Issues

### Firebase Not Configured
```
Error: Firebase Storage bucket not configured
→ Set FIREBASE_STORAGE_BUCKET environment variable
```

### Invalid Service Account
```
Error: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY
→ Ensure JSON is valid and properly quoted
```

### File Not Appearing
```
Images not showing in browser
→ Check public/uploads/ exists
→ Restart dev server
→ Clear browser cache
```

## 📚 Documentation

- **Detailed Guide:** See `STORAGE_ARCHITECTURE.md`
- **Implementation:** See `STORAGE_IMPLEMENTATION_SUMMARY.md`
- **Configuration:** See `.env.example`

## 🔗 Key Concepts

**Dependency Inversion** = High-level modules depend on abstractions, not concretions

```
❌ Before: actions.ts → filesystem directly
✅ After:  actions.ts → IStorageProvider ← LocalStorage/Firebase
```

**Benefits:**
- ✅ Easy to swap storage backends
- ✅ Easy to test (mock providers)
- ✅ Environment-aware
- ✅ Backward compatible

## 💡 Pro Tips

1. **Local Development:** Just run `bun run dev` - no setup needed
2. **Production:** Set Firebase env vars - auto-switches
3. **Testing:** Use mock provider implementing `IStorageProvider`
4. **Extending:** New provider? Implement interface, add to factory
5. **Override:** Use `STORAGE_PROVIDER` env var to force specific provider

---

**Quick Command Reference:**
```bash
# Development (local storage)
bun run dev

# Production build (auto-detects Firebase)
bun run build

# Type check
bun run typecheck

# Force specific provider
STORAGE_PROVIDER=firebase bun run dev
```
