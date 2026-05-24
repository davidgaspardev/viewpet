# Storage Layer

Image storage abstraction using the Dependency Inversion Principle. High-level code depends on `IStorageProvider`, not on any specific backend.

## Architecture

```
High-Level Code (actions.ts)
        ↓ depends on
Facade (src/lib/blobs.ts)
        ↓ uses
Factory (src/lib/storage/index.ts)
        ↓ returns
Interface (IStorageProvider)
        ↓ implemented by
┌───────────┬────────────┬──────────────┐
│  Local    │  Firebase  │     S3       │
│ Provider  │  Provider  │   Provider   │
└───────────┴────────────┴──────────────┘
```

## File Structure

```
src/lib/
├── blobs.ts                  # Facade — backward-compatible public API
└── storage/
    ├── interface.ts          # IStorageProvider interface + types
    ├── local.ts              # LocalStorageProvider (filesystem)
    ├── s3.ts                 # S3StorageProvider (AWS S3)
    └── index.ts              # Factory + provider selection
```

## Quick Start

### Usage (existing code needs no changes)

```typescript
import { savePetImage, SaveImageException } from "@/lib/blobs";

try {
  const url = await savePetImage(hashId, pictureFile);
  // Local:      /uploads/abc123.jpg
  // S3:         https://bucket.s3.us-east-1.amazonaws.com/uploads/abc123.jpg
  // CloudFront: https://d123456789.cloudfront.net/uploads/abc123.jpg
} catch (err) {
  if (err instanceof SaveImageException) {
    // err.code: "empty" | "invalid_type" | "too_large"
  }
}
```

### Direct provider usage

```typescript
import { getStorageProvider } from "@/lib/storage";

const provider = getStorageProvider();
const url = await provider.saveImage(hashId, file);
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | Auto-detect | `"local"` or `"s3"` |
| `AWS_REGION` | S3 | `us-east-1` | AWS region |
| `AWS_S3_BUCKET` | S3 | — | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | S3 | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | S3 | — | AWS secret key |
| `AWS_CLOUDFRONT_DOMAIN` | No | — | CloudFront base URL |
| `AWS_S3_PUBLIC_URL` | No | — | Custom S3 public URL override |
| `AWS_ENDPOINT` | No | — | LocalStack endpoint (e.g. `http://localhost:4566`) |

### Provider Auto-Detection

```
STORAGE_PROVIDER env var
  └─ explicit → use that provider
  └─ not set → check NODE_ENV
       └─ "production" + AWS_S3_BUCKET set → S3
       └─ "production" + FIREBASE_STORAGE_BUCKET set → Firebase
       └─ otherwise → Local
```

## Providers

### LocalStorageProvider

- **Storage**: `public/uploads/<hashId>.<ext>`
- **URLs**: `/uploads/<hashId>.jpg`
- **Best for**: local development, single-server

### S3StorageProvider

- **Storage**: S3 bucket at key `uploads/<hashId>.<ext>`
- **URLs**: Direct S3, CloudFront, or custom domain
- **Best for**: production

### FirebaseStorageProvider

- **Storage**: Firebase Storage bucket
- **URLs**: `https://storage.googleapis.com/...`
- **Best for**: GCP-native deployments
- **Config**: `FIREBASE_STORAGE_BUCKET` + `FIREBASE_SERVICE_ACCOUNT_KEY`

## S3 Setup

### 1. Create Bucket (AWS Console)

1. Go to S3 Console → **Create bucket**
2. Uncheck "Block all public access" (images need public read)
3. Note the bucket name and region

### 2. Bucket Policy (public read)

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
  }]
}
```

### 3. IAM User (minimal permissions)

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject"],
    "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
  }]
}
```

### 4. Environment Variables

```bash
# .env.local
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
STORAGE_PROVIDER=s3

# Optional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net
```

### 5. CORS (for browser uploads)

```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
  "ExposeHeaders": ["ETag"]
}]
```

### 6. Verify

```bash
bun run test-s3-upload.ts
# ✅ Upload successful!
```

## Local Testing Options

### Option 1: Local Filesystem (default)

Zero setup — images saved to `public/uploads/`.

```bash
STORAGE_PROVIDER=local bun run dev
```

### Option 2: Real AWS S3

```bash
STORAGE_PROVIDER=s3
AWS_REGION=sa-east-1
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

```bash
bun run test-s3.ts  # verify credentials first
bun run dev
```

### Option 3: LocalStack (offline S3 mock)

```bash
docker-compose up -d          # starts MongoDB + LocalStack
bun run setup-localstack.ts   # creates bucket + policy
```

```bash
# .env.local
STORAGE_PROVIDER=s3
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=sa-east-1
AWS_S3_BUCKET=view-pet-storage
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

Verify: `docker exec viewpet-localstack awslocal s3 ls s3://view-pet-storage/uploads/`

## Interface

```typescript
interface IStorageProvider {
  saveImage(hashId: string, file: File): Promise<string>;
}

type SaveImageError = "invalid_type" | "too_large" | "empty";

class SaveImageException extends Error {
  code: SaveImageError;
}

const SUPPORTED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
```

## Error Handling

```typescript
try {
  await savePetImage(hashId, file);
} catch (err) {
  if (err instanceof SaveImageException) {
    switch (err.code) {
      case "empty":        // File is empty
      case "invalid_type": // MIME type not supported
      case "too_large":    // Exceeds 5 MB
    }
  }
  // Other errors: network failures, permission errors, S3 access denied
}
```

## Adding New Providers

1. Create `src/lib/storage/newprovider.ts` implementing `IStorageProvider`
2. Add a case to the factory in `index.ts`
3. Add tests

```typescript
// Example: Cloudflare R2 (S3-compatible)
export class R2StorageProvider implements IStorageProvider {
  async saveImage(hashId: string, file: File): Promise<string> {
    // R2 uses the same S3Client with a custom endpoint
    return `https://pub-xyz.r2.dev/uploads/${hashId}.jpg`;
  }
}
```

Possible providers: **Cloudflare R2** (zero egress), **Cloudinary** (image transforms), **Vercel Blob**, **DigitalOcean Spaces**, **Azure Blob Storage**.

## Production Checklist

- [ ] S3 bucket created with public read policy
- [ ] IAM user with minimal permissions (`s3:PutObject`, `s3:GetObject`)
- [ ] Environment variables set in production
- [ ] (Optional) CloudFront distribution created for CDN
- [ ] Upload test: `bun run test-s3-upload.ts`
- [ ] Images publicly accessible via URL

## Troubleshooting

**"S3 bucket not configured"** → Set `AWS_S3_BUCKET`

**"Access Denied" on upload** → Check IAM policy includes `s3:PutObject`

**Images upload but return 403** → Bucket policy must allow `s3:GetObject` for `Principal: "*"`

**Wrong URL format** → Verify `AWS_REGION` matches bucket region; check `AWS_CLOUDFRONT_DOMAIN` value

**Local images not showing** → Ensure `public/uploads/` exists; restart dev server after first upload

## Known Gaps

These are intentionally deferred for production scale:

| Gap | Priority | Fix |
|-----|----------|-----|
| Retry logic on transient S3 errors | High | `new S3Client({ maxAttempts: 3 })` |
| Structured logging / observability | High | Log upload start/success/error with duration |
| Content validation (magic bytes) | High | Use `file-type` library to verify actual MIME |
| Circuit breaker | Medium | `opossum` library |
| Multipart upload for files >5 MB | Low | AWS SDK `Upload` class |
| CDN/caching layer | Low | CloudFront + cache headers |

The current implementation is production-ready for MVP/startup scale. Add observability and retry logic before significant traffic.
