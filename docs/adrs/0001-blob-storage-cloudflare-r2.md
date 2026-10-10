# ADR 0001: Migrate pet-image blob storage from AWS S3 to Cloudflare R2

- **Status**: Accepted
- **Date**: 2026-10-10
- **Issue**: [#31](https://github.com/davidgaspardev/viewpet/issues/31)

## Context

Pet images are uploaded via `savePetImage()` (`src/lib/blobs.ts`), which delegates to a provider selected by `StorageProviderFactory` (`src/lib/storage/factory.ts`). Two providers existed before this ADR: `LocalStorageProvider` (dev, `public/uploads/`) and `S3StorageProvider` (production, AWS S3).

Pet images are served publicly — every QR scan on `/view/<id>` fetches the photo straight from the bucket. That read path is where cost lives: S3 charges roughly **$0.09/GB** for egress to the public internet, and that's the dominant cost driver at any meaningful scale (storage itself is a rounding error — $0.023/GB on S3 vs $0.015/GB on R2). Projected at 100k pets with 50 views/pet/month, egress alone is ~$225/month on S3. R2 charges **$0** for egress.

## Decision

Add `R2StorageProvider` as a third storage provider, selected via `STORAGE_PROVIDER=r2`, alongside the existing `local` and `s3` providers — not a replacement for `S3StorageProvider`, which stays in the codebase as a supported option.

R2 implements the S3 API, so the new provider reuses `@aws-sdk/client-s3` pointed at the R2 account endpoint (`https://<account-id>.r2.cloudflarestorage.com`, `region: "auto"`, path-style addressing) instead of introducing a new SDK. `savePetImage()`'s signature and every consumer of it are unaffected — this is purely a new leaf behind the existing `StorageProvider` port (see `PATTERN.md` — Dependency Inversion).

## Alternatives considered

- **Stay on S3 + add CloudFront.** Works, but adds a service to configure and still has egress cost at the CloudFront edge.
- **Vercel Blob.** Excellent DX, but storage *and* egress are both billed, and it's a vendor-specific API (not S3-compatible) — a future migration off it would cost as much as this one. Also already evaluated and rejected for this project's local/blob storage decision in an earlier iteration.
- **Supabase Storage.** Would make sense if the project were on Supabase Postgres. It isn't (MongoDB) — rejected to avoid a second vendor just for blobs.
- **Backblaze B2 + Cloudflare.** Cheap, comparable end result, but more plumbing than R2 for the same outcome.

## Consequences

- No consumer code changes — the provider abstraction already absorbed this (`src/lib/storage/interface.ts`).
- New required env vars for the `r2` provider: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL_BASE` — documented in `src/lib/storage/README.md`.
- Unlike S3, R2 has no canonical default public URL derivable from account id + bucket name (no bucket-policy equivalent) — public access and a domain (custom or `pub-<hash>.r2.dev`) must be configured explicitly in the Cloudflare dashboard before the provider is usable. `R2StorageProvider` throws eagerly at construction if `R2_PUBLIC_URL_BASE` is missing, same pattern `S3StorageProvider` uses for a missing bucket.
- **No São Paulo region on R2** (R2 is edge-global, not single-region). Not a data-residency problem under LGPD for pet photos (not personal/sensitive data in the strict sense), but worth revisiting if that policy stance changes.
- **Vendor lock-in to Cloudflare** is mitigated by the S3-compatible API — exiting R2 later costs the same effort as this migration did.
- **Cutover for existing S3-backed pets is a separate, manual operational step**, not covered by this ADR's code change: migrate objects with `rclone copy s3remote:bucket r2remote:bucket`, then rewrite `pictureUrl` values already stored in MongoDB to the new `R2_PUBLIC_URL_BASE`, then flip `STORAGE_PROVIDER=r2` in production. Keep the S3 bucket read-only for a safety window before deleting it. See `src/lib/storage/README.md` → "Migrating existing objects from S3".
