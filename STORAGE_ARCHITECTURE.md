# Storage Layer Architecture - Dependency Inversion Implementation

## Overview

The image storage layer has been refactored using **Dependency Inversion Principle** (SOLID). High-level business logic now depends on abstractions (interfaces) rather than concrete implementations.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           High-Level Code (actions.ts)              │
│                                                      │
│  import { savePetImage } from "@/lib/blobs"         │
└─────────────────────┬───────────────────────────────┘
                      │ depends on
                      ↓
┌─────────────────────────────────────────────────────┐
│         Facade Layer (src/lib/blobs.ts)             │
│                                                      │
│  • Backward-compatible API                          │
│  • Delegates to factory                             │
└─────────────────────┬───────────────────────────────┘
                      │ uses
                      ↓
┌─────────────────────────────────────────────────────┐
│      Factory (src/lib/storage/index.ts)             │
│                                                      │
│  • getStorageProvider()                             │
│  • Environment-based selection                      │
│  • Singleton caching                                │
└─────────────────────┬───────────────────────────────┘
                      │ returns
                      ↓
┌─────────────────────────────────────────────────────┐
│    Interface (src/lib/storage/interface.ts)         │
│                                                      │
│  IStorageProvider {                                 │
│    saveImage(hashId, file): Promise<string>         │
│  }                                                   │
└─────────────────────┬───────────────────────────────┘
                      │ implemented by
           ┌──────────┴──────────┬──────────────┐
           ↓                     ↓              ↓
┌──────────────────┐   ┌──────────────────────┐  ┌──────────────────┐
│ LocalStorage     │   │ FirebaseStorage      │  │ S3Storage        │
│ Provider         │   │ Provider             │  │ Provider         │
│                  │   │                      │  │                  │
│ • public/uploads │   │ • Firebase Storage   │  │ • AWS S3         │
│ • /uploads URLs  │   │ • CDN URLs           │  │ • CloudFront CDN │
└──────────────────┘   └──────────────────────┘  └──────────────────┘
```

## File Structure

```
src/lib/
├── blobs.ts                    # Facade (backward-compatible API)
└── storage/
    ├── interface.ts            # IStorageProvider + types
    ├── local.ts                # LocalStorageProvider
    ├── firebase.ts             # FirebaseStorageProvider
    ├── s3.ts                   # S3StorageProvider (AWS S3)
    └── index.ts                # Factory + provider selection
```

## Components

### 1. Interface (`interface.ts`)

Defines the contract all storage providers must implement:

```typescript
interface IStorageProvider {
  saveImage(hashId: string, file: File): Promise<string>;
}
```

**Exports:**
- `IStorageProvider` - Main interface
- `SaveImageException` - Validation error class
- `SaveImageError` - Error type codes
- `SUPPORTED_IMAGE_MIMES` - Allowed MIME types
- `MAX_IMAGE_BYTES` - Size limit (5 MB)
- `getExtensionFromMime()` - Helper function

### 2. Local Storage Provider (`local.ts`)

**LocalStorageProvider** - Filesystem-based storage

- **Storage location:** `public/uploads/<hashId>.<ext>`
- **URLs returned:** `/uploads/<hashId>.jpg`
- **Suitable for:**
  - Local development
  - Single-server deployments
  - MVPs and prototypes

**Features:**
- Automatic directory creation
- Previous file cleanup (handles re-uploads)
- Permission error handling

### 3. Firebase Storage Provider (`firebase.ts`)

**FirebaseStorageProvider** - Cloud storage via Firebase

- **Storage location:** Firebase Storage bucket
- **URLs returned:** `https://storage.googleapis.com/...`
- **Suitable for:**
  - Production deployments
  - Multi-server environments
  - Serverless platforms
  - Global CDN distribution

**Features:**
- Automatic Firebase Admin SDK initialization
- Public URL generation
- Metadata tracking
- Automatic file overwriting (re-uploads)
- Service account or ADC authentication

### 4. S3 Storage Provider (`s3.ts`)

**S3StorageProvider** - Cloud storage via AWS S3

- **Storage location:** S3 bucket (e.g., `viewpet-images-prod`)
- **URLs returned:** 
  - Direct S3: `https://bucket.s3.region.amazonaws.com/uploads/abc.jpg`
  - CloudFront: `https://d123456789.cloudfront.net/uploads/abc.jpg`
  - Custom domain: `https://cdn.yourdomain.com/uploads/abc.jpg`
- **Suitable for:**
  - Production deployments
  - Multi-server/serverless environments
  - Cost-effective storage
  - Global CDN via CloudFront
  - High-scale applications

**Features:**
- AWS SDK v3 (modular, tree-shakeable)
- CloudFront CDN support
- Custom domain support
- Cache-Control headers (1 year)
- Public-read ACL
- Automatic file overwriting (re-uploads)
- Proper content-type metadata

### 5. Factory (`index.ts`)

**getStorageProvider()** - Intelligent provider selection

**Selection Logic:**
1. Check `STORAGE_PROVIDER` env var (explicit)
2. Auto-detect from `NODE_ENV`:
   - `production` → S3 (if configured) → Firebase (if configured) → Local
   - `development`/`test` → Local
   - Default → Local

**Features:**
- Singleton pattern (caches instance)
- Environment logging
- Fallback handling
- Re-exports for convenience

### 6. Facade (`blobs.ts`)

**savePetImage()** - Backward-compatible wrapper

Maintains existing API while delegating to the factory:

```typescript
export async function savePetImage(
  hashId: string, 
  file: File
): Promise<string> {
  const provider = getStorageProvider();
  return provider.saveImage(hashId, file);
}
```

**Zero breaking changes** - All existing imports continue to work!

## Configuration

### Environment Variables

#### Local Storage (Default)
```bash
# No configuration needed
# Automatically used in development
```

#### AWS S3 Storage (Production)
```bash
# Required
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Optional: Force specific provider
STORAGE_PROVIDER=s3

# Optional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net

# Optional: Custom public URL
AWS_S3_PUBLIC_URL=https://cdn.yourdomain.com
```

**See [S3_SETUP.md](./S3_SETUP.md) for detailed setup instructions.**

#### Firebase Storage (Production)
```bash
# Required
FIREBASE_STORAGE_BUCKET=your-app.appspot.com

# Option 1: Service Account Credentials (recommended)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'

# Option 2: Use Application Default Credentials (Google Cloud)
# No additional env var needed - works automatically in GCP

# Optional: Force specific provider
STORAGE_PROVIDER=firebase  # or "local"
```

### Getting Firebase Credentials

1. **Service Account Key:**
   ```bash
   # In Firebase Console:
   # Project Settings → Service Accounts → Generate New Private Key
   
   # Minify JSON and set as env var:
   export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

2. **Application Default Credentials (ADC):**
   - Automatically works in Google Cloud environments
   - No env var needed
   - Falls back if SERVICE_ACCOUNT_KEY not set

### Firebase Setup

```bash
# 1. Install dependency (already done)
bun add firebase-admin

# 2. Create Firebase project (if needed)
# Visit: https://console.firebase.google.com/

# 3. Enable Firebase Storage
# Firebase Console → Storage → Get Started

# 4. Set storage rules (make files public or restricted)
# Storage → Rules:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{imageId} {
      allow read;  // Public read
      allow write: if request.auth != null;  // Auth required for write
    }
  }
}

# 5. Get bucket name
# Storage → Files → Copy bucket name (e.g., "your-app.appspot.com")
```

## Usage Examples

### Basic Usage (No Changes Needed)

```typescript
// In actions.ts or any server component
import { savePetImage } from "@/lib/blobs";

const pictureUrl = await savePetImage(hashId, pictureFile);
// Returns: "/uploads/abc.jpg" (local) or "https://storage.googleapis.com/..." (firebase)
```

### Direct Provider Usage (Advanced)

```typescript
import { getStorageProvider } from "@/lib/storage";

const provider = getStorageProvider();
const url = await provider.saveImage(hashId, file);
```

### Testing with Mock Provider

```typescript
import type { IStorageProvider } from "@/lib/storage";

class MockStorageProvider implements IStorageProvider {
  async saveImage(hashId: string, file: File): Promise<string> {
    return `https://mock.example.com/${hashId}.jpg`;
  }
}

// Use in tests...
```

## SOLID Principles Applied

### ✅ Dependency Inversion Principle (DIP)
**"Depend on abstractions, not concretions"**

- High-level code (`actions.ts`) depends on `IStorageProvider` interface
- Not coupled to `LocalStorageProvider` or `FirebaseStorageProvider` directly
- Easy to swap implementations without touching business logic

### ✅ Open/Closed Principle (OCP)
**"Open for extension, closed for modification"**

- Adding new providers (S3, Cloudinary, Cloudflare R2) requires:
  - Creating new class implementing `IStorageProvider`
  - Adding case to factory
  - Zero changes to existing code

### ✅ Single Responsibility Principle (SRP)
**"A class should have one reason to change"**

- `LocalStorageProvider`: Only handles filesystem storage
- `FirebaseStorageProvider`: Only handles Firebase Storage
- Factory: Only handles provider selection
- Facade: Only provides backward-compatible API

### ✅ Liskov Substitution Principle (LSP)
**"Objects should be replaceable with subtypes"**

- Any `IStorageProvider` implementation can be swapped in
- All providers return public URL strings
- All providers throw same exception types
- Consuming code doesn't need to know which provider is active

### ✅ Interface Segregation Principle (ISP)
**"Clients shouldn't depend on methods they don't use"**

- `IStorageProvider` has single method: `saveImage()`
- Minimal interface surface
- No unnecessary methods to implement

## Migration Guide

### For Existing Code
**No changes needed!** The facade maintains backward compatibility:

```typescript
// This still works exactly as before
import { savePetImage, SaveImageException } from "@/lib/blobs";
```

### For New Code
Can use either approach:

```typescript
// Option 1: Use facade (recommended for consistency)
import { savePetImage } from "@/lib/blobs";

// Option 2: Use factory directly (more explicit)
import { getStorageProvider } from "@/lib/storage";
const provider = getStorageProvider();
```

## Testing

### Local Development
```bash
# Uses LocalStorageProvider automatically
bun run dev
# Images saved to: public/uploads/
```

### Production Testing
```bash
# Set Firebase credentials
export FIREBASE_STORAGE_BUCKET=your-app.appspot.com
export FIREBASE_SERVICE_ACCOUNT_KEY='...'
export NODE_ENV=production

# Or force Firebase in development
export STORAGE_PROVIDER=firebase

bun run build
bun run start
```

### Force Local in Production (Not Recommended)
```bash
export NODE_ENV=production
export STORAGE_PROVIDER=local  # Override auto-detection
```

## Error Handling

### Client-Correctable Errors
```typescript
try {
  await savePetImage(hashId, file);
} catch (err) {
  if (err instanceof SaveImageException) {
    switch (err.code) {
      case "empty": // File is empty
      case "invalid_type": // Wrong MIME type
      case "too_large": // Exceeds 5 MB
    }
  }
}
```

### System Errors
- Network failures
- Permission errors
- Firebase configuration issues
- Throw standard `Error` objects

## Future Extensions

### Adding New Providers

**Example: Cloudflare R2 Provider**

```typescript
// src/lib/storage/r2.ts
import type { IStorageProvider } from "./interface";
import { S3Client } from "@aws-sdk/client-s3"; // R2 is S3-compatible!

export class R2StorageProvider implements IStorageProvider {
  async saveImage(hashId: string, file: File): Promise<string> {
    // R2 upload logic (similar to S3)...
    return `https://pub-xyz.r2.dev/${hashId}.jpg`;
  }
}

// src/lib/storage/index.ts - Add to factory
case "r2":
  storageProviderInstance = new R2StorageProvider();
  break;
```

### Other Possible Providers
- **AWS S3** - ✅ **Implemented!** (see `s3.ts`)
- **Cloudflare R2** - S3-compatible, zero egress fees
- **Cloudinary** - Image optimization + transformations
- **Vercel Blob** - Optimized for Vercel deployments
- **DigitalOcean Spaces** - S3-compatible object storage
- **Azure Blob Storage** - Microsoft cloud storage
- **Backblaze B2** - Cost-effective S3-compatible storage

## Benefits

### Developer Experience
- ✅ **Local development works out of the box** - no cloud setup needed
- ✅ **Production-ready** - swap to Firebase with just env vars
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Testable** - Easy to mock providers

### Architecture
- ✅ **Decoupled** - Business logic isolated from storage details
- ✅ **Flexible** - Swap providers without code changes
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Extensible** - Add new providers easily

### Operations
- ✅ **Environment-aware** - Auto-selects correct provider
- ✅ **Configurable** - Override via env vars
- ✅ **Observable** - Logs which provider is active
- ✅ **Resilient** - Graceful fallbacks

## Troubleshooting

### S3 Errors

**"S3 bucket not configured"**
```bash
# Solution: Set bucket name
export AWS_S3_BUCKET=your-bucket-name
```

**"Access Denied"**
- Check IAM policy includes `s3:PutObject` and `s3:PutObjectAcl`
- Verify AWS credentials are correct
- Ensure bucket allows public read (bucket policy or ACL)

**"Invalid credentials"**
- Double-check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Verify IAM user has access keys enabled

**Images upload but return 403**
- Check bucket policy allows public `s3:GetObject`
- Verify "Block Public Access" settings
- If using ACLs, enable Object Ownership

See [S3_SETUP.md](./S3_SETUP.md) for detailed troubleshooting.

### Firebase Errors

**"Firebase Storage bucket not configured"**
```bash
# Solution: Set bucket name
export FIREBASE_STORAGE_BUCKET=your-app.appspot.com
```

**"Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY"**
```bash
# Solution: Ensure JSON is valid and properly quoted
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**"Firebase Storage upload failed: Permission denied"**
- Check Storage Rules in Firebase Console
- Verify service account has Storage Admin role
- Ensure bucket name is correct

### Local Storage Errors

**"EPERM: operation not permitted"**
- Some filesystems don't allow unlinking files
- Non-fatal - new uploads will overwrite
- More common in Docker/mounted volumes

**Files not appearing**
- Check `public/uploads/` exists
- Verify Next.js is serving `/uploads` path
- Restart dev server after first upload

## Summary

This implementation demonstrates **clean architecture principles**:

1. **Business logic is isolated** - `actions.ts` doesn't care about storage
2. **Dependencies point inward** - Concrete implementations depend on abstractions
3. **Easy to test** - Mock providers for unit tests
4. **Easy to extend** - Add S3, Cloudinary, etc. without breaking changes
5. **Production-ready** - Works in both dev and prod with zero code changes

**The key insight:** High-level policy (save pet image) should not depend on low-level details (filesystem vs cloud storage). Both should depend on abstractions (the `IStorageProvider` interface).
