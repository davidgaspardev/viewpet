# ADR 0001: Migrate pet-image blob storage from AWS S3 to Cloudflare R2

- **Status**: Accepted
- **Date**: 2026-10-10
- **Issue**: [#31](https://github.com/davidgaspardev/viewpet/issues/31)

## Context

Pet images are uploaded via `savePetImage()` (`src/lib/blobs.ts`), which delegates to a provider selected by `StorageProviderFactory` (`src/lib/storage/factory.ts`). Two providers existed before this ADR: `LocalStorageProvider` (dev, `public/uploads/`) and `S3StorageProvider` (production, AWS S3).

Pet images are served publicly — every QR scan on `/tag/<id>` fetches the photo straight from the bucket. That read path is where cost lives: S3 charges roughly **$0.09/GB** for egress to the public internet, and that's the dominant cost driver at any meaningful scale (storage itself is a rounding error — $0.023/GB on S3 vs $0.015/GB on R2). Projected at 100k pets with 50 views/pet/month, egress alone is ~$225/month on S3. R2 charges **$0** for egress.

## Decision

Add `R2StorageProvider` as a third storage provider, selected via `STORAGE_PROVIDER=r2`, alongside the existing `local` and `s3` providers — not a replacement for `S3StorageProvider`, which stays in the codebase as a supported option.

R2 implements the S3 API, so the new provider reuses `@aws-sdk/client-s3` pointed at the R2 account endpoint (`https://<account-id>.r2.cloudflarestorage.com`, `region: "auto"`, path-style addressing) instead of introducing a new SDK. `savePetImage()`'s signature and every consumer of it are unaffected — this is purely a new leaf behind the existing `StorageProvider` port (see `PATTERN.md` — Dependency Inversion).

**Public URL, direct — no proxy.** R2 buckets are private by default and have no bucket-policy equivalent to S3's public-read JSON; enabling public access is an explicit Cloudflare dashboard step (bucket → Settings → Public access, or a custom domain). `saveImage()` returns `R2_ACCESS_SUBDOMAIN` + key, same shape as `S3StorageProvider`'s direct URL.

This went through two interim designs before landing here, worth recording:
1. **Optional direct URL, proxy fallback** (`R2_PUBLIC_URL_BASE`, falling back to `/api/images/<key>` when unset) — added after the first rollout attempt left the bucket private, so the "public" URL 403'd in the browser. Rejected for adding a second env var and a conditional code path for a mode that was never going to be the one actually used.
2. **Always-proxy, no public URL at all** — simplified #1 by removing the env var entirely and always serving through an authenticated route (`src/app/api/images/[...key]/route.ts`) that held the R2 credentials and streamed the object back. This worked, but meant every image view's bandwidth was paid for by our own server instead of Cloudflare's CDN — directly undercutting the zero-egress cost motivation for this migration in the first place.

Once public access was actually enabled and confirmed working in the Cloudflare dashboard, the proxy route and `R2StorageProvider.getImage()` were deleted — there's no reason to keep infrastructure around for a failure mode (misconfigured public access) that's now been fixed at the source.

## Alternatives considered

- **Stay on S3 + add CloudFront.** Works, but adds a service to configure and still has egress cost at the CloudFront edge.
- **Vercel Blob.** Excellent DX, but storage *and* egress are both billed, and it's a vendor-specific API (not S3-compatible) — a future migration off it would cost as much as this one. Also already evaluated and rejected for this project's local/blob storage decision in an earlier iteration.
- **Supabase Storage.** Would make sense if the project were on Supabase Postgres. It isn't (MongoDB) — rejected to avoid a second vendor just for blobs.
- **Backblaze B2 + Cloudflare.** Cheap, comparable end result, but more plumbing than R2 for the same outcome.

## Consequences

- No consumer code changes — the provider abstraction already absorbed this (`src/lib/storage/interface.ts`).
- Required env vars for the `r2` provider: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ACCESS_SUBDOMAIN` — documented in `src/lib/storage/README.md`.
- Public access must be verified working (loads without credentials, in an incognito window) before trusting `R2_ACCESS_SUBDOMAIN` in production — there's no proxy fallback anymore to mask a misconfiguration.
- **No São Paulo region on R2** (R2 is edge-global, not single-region). Not a data-residency problem under LGPD for pet photos (not personal/sensitive data in the strict sense), but worth revisiting if that policy stance changes.
- **Vendor lock-in to Cloudflare** is mitigated by the S3-compatible API — exiting R2 later costs the same effort as this migration did.
- **Cutover for existing S3-backed pets is a separate, manual operational step**, not covered by this ADR's code change: migrate objects with `rclone copy s3remote:bucket r2remote:bucket`, then rewrite `pictureUrl` values already stored in MongoDB to the new `R2_ACCESS_SUBDOMAIN`, then flip `STORAGE_PROVIDER=r2` in production. Keep the S3 bucket read-only for a safety window before deleting it. See `src/lib/storage/README.md` → "Migrating existing objects from S3".
