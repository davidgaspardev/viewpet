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

**Public URL has two modes, not one.** R2 buckets are private by default and have no bucket-policy equivalent to S3's public-read JSON — enabling public access is an explicit, easy-to-get-wrong Cloudflare dashboard step (confirmed the hard way: the first rollout attempt left the bucket private, so the "public" URL `saveImage()` returned 403'd in the browser). Making `R2_PUBLIC_URL_BASE` a hard requirement, as the initial version of this ADR did, means a misconfigured dashboard silently breaks every pet photo in production with no app-level signal.

So `R2StorageProvider` picks the URL shape based on what's actually configured:
- `R2_PUBLIC_URL_BASE` set → direct URL, same shape as S3 (`<base>/<key>`). Zero-egress, served from Cloudflare's CDN — the actual cost win this migration is for.
- `R2_PUBLIC_URL_BASE` unset (default) → `/api/images/<key>`, a new authenticated route (`src/app/api/images/[...key]/route.ts`) that holds the R2 credentials, fetches the object server-side (`R2StorageProvider.getImage()`), and streams it back. Works with a fully private bucket — no dashboard step can break it — at the cost of proxying bytes through our own server instead of straight from R2.

The proxy response reuses the same `Cache-Control: public, max-age=31536000, immutable` set at upload time, so the platform's edge cache (not this route) serves repeat views — the egress-cost gap between the two modes is mostly a first-request-per-image cost, not a per-view one.

## Alternatives considered

- **Stay on S3 + add CloudFront.** Works, but adds a service to configure and still has egress cost at the CloudFront edge.
- **Vercel Blob.** Excellent DX, but storage *and* egress are both billed, and it's a vendor-specific API (not S3-compatible) — a future migration off it would cost as much as this one. Also already evaluated and rejected for this project's local/blob storage decision in an earlier iteration.
- **Supabase Storage.** Would make sense if the project were on Supabase Postgres. It isn't (MongoDB) — rejected to avoid a second vendor just for blobs.
- **Backblaze B2 + Cloudflare.** Cheap, comparable end result, but more plumbing than R2 for the same outcome.

## Consequences

- No consumer code changes — the provider abstraction already absorbed this (`src/lib/storage/interface.ts`).
- Required env vars for the `r2` provider: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. `R2_PUBLIC_URL_BASE` is optional (see above) — documented in `src/lib/storage/README.md`.
- A new route, `src/app/api/images/[...key]/route.ts`, exists purely to serve R2 objects when the bucket is private. It validates the requested key against the exact shape `saveImage()` writes (`uploads/<hashId>.<ext>`, hashId passing `isHashId()`) before touching R2, and checks the active provider is actually `R2StorageProvider` — it's a 404, not a generic bucket-object proxy, by design.
- **No São Paulo region on R2** (R2 is edge-global, not single-region). Not a data-residency problem under LGPD for pet photos (not personal/sensitive data in the strict sense), but worth revisiting if that policy stance changes.
- **Vendor lock-in to Cloudflare** is mitigated by the S3-compatible API — exiting R2 later costs the same effort as this migration did.
- **Cutover for existing S3-backed pets is a separate, manual operational step**, not covered by this ADR's code change: migrate objects with `rclone copy s3remote:bucket r2remote:bucket`, then rewrite `pictureUrl` values already stored in MongoDB to the new URL shape (direct `R2_PUBLIC_URL_BASE` URL, or `/api/images/<key>` if staying on the proxy), then flip `STORAGE_PROVIDER=r2` in production. Keep the S3 bucket read-only for a safety window before deleting it. See `src/lib/storage/README.md` → "Migrating existing objects from S3".
- **Follow-up, not blocking**: revisit enabling and verifying R2 public access later to drop the proxy hop and get the full zero-egress benefit. Nothing about the current code needs to change for that — just set `R2_PUBLIC_URL_BASE` once it's confirmed working.
