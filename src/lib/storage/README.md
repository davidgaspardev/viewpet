# Storage Layer

Image storage abstraction using the Dependency Inversion Principle. High-level code depends on `StorageProvider`, not on any specific backend.

## Architecture

```
High-Level Code (actions.ts)
        ↓ depends on
Facade (src/lib/blobs.ts)
        ↓ uses
StorageProviderFactory (src/lib/storage/factory.ts)
        ↓ returns
Interface (StorageProvider)
        ↓ implemented by
┌───────────┬──────────────┬──────────────┐
│  Local    │     S3       │      R2      │
│ Provider  │   Provider   │   Provider   │
└───────────┴──────────────┴──────────────┘
```

## File Structure

```
src/lib/
├── blobs.ts                  # Facade — backward-compatible public API
└── storage/
    ├── interface.ts          # StorageProvider interface + types
    ├── local.ts              # LocalStorageProvider (filesystem)
    ├── s3.ts                 # S3StorageProvider (AWS S3)
    ├── r2.ts                 # R2StorageProvider (Cloudflare R2)
    ├── factory.ts            # StorageProviderFactory — singleton, provider selection
    └── index.ts              # barrel puro
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
  // R2:         /api/images/uploads/abc123.jpg (served by our own proxy route)
} catch (err) {
  if (err instanceof SaveImageException) {
    // err.code: "empty" | "invalid_type" | "too_large"
  }
}
```

### Direct provider usage

```typescript
import { StorageProviderFactory } from "@/lib/storage";

const provider = StorageProviderFactory.getInstance();
const url = await provider.saveImage(hashId, file);
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | `"local"` | `"local"`, `"s3"`, or `"r2"` |
| `AWS_REGION` | S3 | `us-east-1` | AWS region |
| `AWS_S3_BUCKET` | S3 | — | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | S3 | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | S3 | — | AWS secret key |
| `AWS_CLOUDFRONT_DOMAIN` | No | — | CloudFront base URL |
| `AWS_S3_PUBLIC_URL` | No | — | Custom S3 public URL override |
| `AWS_ENDPOINT` | No | — | LocalStack endpoint (e.g. `http://localhost:4566`) |
| `R2_ACCOUNT_ID` | R2 | — | Cloudflare account id — builds the R2 endpoint |
| `R2_ACCESS_KEY_ID` | R2 | — | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 | — | R2 API token secret |
| `R2_BUCKET` | R2 | — | R2 bucket name |

### Provider Selection

```
STORAGE_PROVIDER env var
  └─ "s3" or "r2" → use that provider
  └─ not set, or an unrecognized value → Local (unknown values log a warning)
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

### R2StorageProvider

- **Storage**: R2 bucket at key `uploads/<hashId>.<ext>` (same S3-compatible API as `S3StorageProvider`, pointed at the R2 endpoint)
- **URLs**: always `/api/images/<key>` — our own route (`src/app/api/images/[...key]/route.ts`) that fetches the object with R2 credentials and serves it. The bucket is always private; the browser never talks to R2 directly. Responses carry the same 1-year immutable `Cache-Control` as the upload, so repeat views hit the platform's edge cache rather than this route.
- **Best for**: production, public/immutable assets served at scale — R2 has zero egress fees, which dominates the cost of serving pet photos on every public profile view.

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

## R2 Setup

### 1. Create Bucket (Cloudflare Dashboard)

1. Go to **R2** → **Create bucket**
2. Note the bucket name and your account id (shown in the R2 overview sidebar — also the subdomain of `https://dash.cloudflare.com/<account-id>/r2`)

The bucket stays private — no public-access or custom-domain step needed. `src/app/api/images/[...key]/route.ts` holds the credentials and serves images server-side via `R2StorageProvider.getImage()`, so there's nothing to configure in the Cloudflare dashboard beyond the bucket and the API token below.

### 2. API Token (minimal permissions)

**R2** → **Manage API Tokens** → **Create API Token** → scope to the bucket with **Object Read & Write** permission only. This gives you `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.

### 3. Environment Variables

```bash
# .env.local
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=viewpet-images-prod
STORAGE_PROVIDER=r2
```

### 4. CORS (for browser uploads)

Same shape as S3 — **R2 bucket** → **Settings** → **CORS Policy**:

```json
[{
  "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"]
}]
```

### 5. Verify

```bash
bun run test:r2-upload
# ✅ Upload successful!
```

### Migrating existing objects from S3

R2's S3-compatible API makes `rclone` a drop-in migration tool:

```bash
rclone copy s3remote:your-s3-bucket r2remote:your-r2-bucket --progress
```

Keep the S3 bucket around (read-only) for a safety window after cutover, then delete it once R2 is confirmed serving traffic correctly. Existing `pictureUrl` values already stored in MongoDB point at the old S3 URLs — those need a one-time rewrite to `/api/images/uploads/<hashId>.<ext>` as part of cutover. Outside the scope of this abstraction layer; see the ADR for the full rollout plan.

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

### Option 4: Real Cloudflare R2

```bash
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=your-bucket
```

```bash
bun run test:r2-upload  # verify credentials first
bun run dev
```

## Interface

```typescript
interface StorageProvider {
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

1. Create `src/lib/storage/newprovider.ts` implementing `StorageProvider`
2. Add a case to `StorageProviderFactory` (`factory.ts`)
3. Add tests

`r2.ts` is a real example of this: an S3-compatible provider that reuses `S3Client` pointed at a different endpoint — see it for the pattern.

Possible further providers: **Cloudinary** (image transforms), **DigitalOcean Spaces**, **Azure Blob Storage**.

## Production Checklist

**S3:**
- [ ] S3 bucket created with public read policy
- [ ] IAM user with minimal permissions (`s3:PutObject`, `s3:GetObject`)
- [ ] Environment variables set in production
- [ ] (Optional) CloudFront distribution created for CDN
- [ ] Upload test: `bun run test-s3-upload.ts`
- [ ] Images publicly accessible via URL

**R2:**
- [ ] R2 bucket created
- [ ] API token scoped to the bucket with Object Read & Write only
- [ ] Environment variables set in production
- [ ] Upload test: `bun run test:r2-upload`
- [ ] Images load at the returned `/api/images/<key>` URL
- [ ] If migrating from S3: existing `pictureUrl` values rewritten to the new URL shape

## Troubleshooting

**"S3 bucket not configured"** → Set `AWS_S3_BUCKET`

**"Access Denied" on upload** → Check IAM policy includes `s3:PutObject`

**Images upload but return 403** → Bucket policy must allow `s3:GetObject` for `Principal: "*"`

**Wrong URL format** → Verify `AWS_REGION` matches bucket region; check `AWS_CLOUDFRONT_DOMAIN` value

**Local images not showing** → Ensure `public/uploads/` exists; restart dev server after first upload

**`/api/images/<key>` returns 404** → Either the key doesn't match `uploads/<hashId>.<ext>` (the route only serves that shape, by design), or `STORAGE_PROVIDER` isn't `r2` on the server handling the request, or the object genuinely doesn't exist in the bucket.

**`/api/images/<key>` returns 500** → R2 credentials are likely misconfigured (`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) or there's a network error reaching R2 — check the server logs for `[api/images] failed to fetch ... from R2`.

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
