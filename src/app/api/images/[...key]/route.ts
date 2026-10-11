import { NextResponse } from "next/server";
import { StorageProviderFactory } from "@/lib/storage";
import type { StorageProvider } from "@/lib/storage/interface";
import {
  SUPPORTED_IMAGE_MIMES,
  getExtensionFromMime,
  IMMUTABLE_CACHE_CONTROL,
} from "@/lib/storage/interface";
import { isHashId } from "@/lib/utils/ids";

/**
 * Authenticated proxy for R2 objects.
 *
 * Only exists for `STORAGE_PROVIDER=r2` (see `R2StorageProvider`) — that
 * bucket is always private, and this route holds the R2 credentials so the
 * browser never needs them. `local` serves its images as real static files
 * under `public/uploads/`, and `s3` returns a direct (CloudFront/bucket)
 * URL, so neither needs this route.
 *
 * Images are immutable per hashId, so responses are cached for a year —
 * repeat views hit the platform's edge cache, not this function, keeping
 * the R2-egress cost advantage mostly intact after the first request.
 */

const SUPPORTED_EXTENSIONS = new Set(
  SUPPORTED_IMAGE_MIMES.map(getExtensionFromMime).filter((ext): ext is string => Boolean(ext)),
);

/**
 * Only ever serve exactly what `R2StorageProvider.saveImage()` writes —
 * `<basePath>/<hashId>.<ext>`. `basePath` comes from the live provider
 * instance (not a hardcoded "uploads" literal) so this can't drift from
 * whatever `R2StorageProvider` is actually configured to write.
 *
 * The regex is cached by `basePath` — the provider is a singleton for the
 * life of the process, so in practice this compiles once, not per request.
 */
const keyPatternCache = new Map<string, RegExp>();

function keyPatternFor(basePath: string): RegExp {
  let pattern = keyPatternCache.get(basePath);
  if (!pattern) {
    const escapedBasePath = basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pattern = new RegExp(`^${escapedBasePath}/([^/.]+)\\.([a-z0-9]+)$`);
    keyPatternCache.set(basePath, pattern);
  }
  return pattern;
}

function isValidKey(key: string, basePath: string): boolean {
  const match = keyPatternFor(basePath).exec(key);
  if (!match) return false;
  const [, hashId, ext] = match;
  return isHashId(hashId) && SUPPORTED_EXTENSIONS.has(ext);
}

type ReadableProvider = StorageProvider & {
  getImage(key: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string }>;
  basePath: string;
};

/**
 * Duck-types for `R2StorageProvider`'s read capability instead of
 * `instanceof R2StorageProvider`. `instanceof` compares class *identity*,
 * and in Next.js dev mode, Fast Refresh can re-evaluate the module that
 * defines `R2StorageProvider` independently of the long-lived singleton
 * cached on `globalThis` by `StorageProviderFactory` — the singleton then
 * holds an instance built from the *previous* class definition, so
 * `instanceof` against the freshly re-imported class returns false even
 * though it's the same provider, same `constructor.name`, same everything
 * that matters. Checking for the method directly sidesteps that entirely
 * (and doesn't need to import the concrete class at all).
 */
function isReadableProvider(provider: StorageProvider): provider is ReadableProvider {
  return typeof (provider as Partial<ReadableProvider>).getImage === "function";
}

/**
 * True for a missing-object error from R2's GetObjectCommand.
 *
 * Checks the HTTP status first — it's set directly from R2's response and
 * doesn't depend on the AWS SDK recognizing the exact S3 error code/casing
 * in the (S3-compatible, not S3-identical) XML body. `.name === "NoSuchKey"`
 * is kept as a fallback for the normal case where the SDK does model it.
 */
function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return status === 404 || err.name === "NoSuchKey";
}

type Params = { key: string[] };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const { key: segments } = await params;
  const key = segments.join("/");

  try {
    const provider = StorageProviderFactory.getInstance();
    if (!isReadableProvider(provider)) {
      // Active provider doesn't support getImage() — this route has nothing
      // to serve. Logged because this is always a config issue
      // (STORAGE_PROVIDER isn't "r2" in *this* process/env), never
      // something a client did — a URL built by R2StorageProvider's
      // saveImage() should never reach here otherwise.
      console.warn(
        `[api/images] "${key}" requested but active provider is ${provider.constructor.name}, which doesn't support reads — check STORAGE_PROVIDER for this process.`,
      );
      return new NextResponse("Not found", { status: 404 });
    }

    if (!isValidKey(key, provider.basePath)) {
      console.warn(`[api/images] "${key}" doesn't match the expected <basePath>/<hashId>.<ext> shape`);
      return new NextResponse("Not found", { status: 404 });
    }

    const { body, contentType } = await provider.getImage(key);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": IMMUTABLE_CACHE_CONTROL,
      },
    });
  } catch (err) {
    if (isNotFoundError(err)) {
      // Logged (not silent) because "not found" from R2 is ambiguous: it
      // covers both "this key genuinely doesn't exist" (expected for a
      // stale/bad pictureUrl) and "R2_BUCKET/R2_ACCOUNT_ID point at the
      // wrong bucket" (a config bug — S3-compatible APIs 404 on
      // NoSuchBucket too). The error name/message below tells you which.
      console.warn(`[api/images] "${key}" not found in R2:`, err);
      return new NextResponse("Not found", { status: 404 });
    }
    console.error(`[api/images] failed to fetch "${key}" from R2:`, err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
