import { NextResponse } from "next/server";
import { StorageProviderFactory } from "@/lib/storage";
import { R2StorageProvider } from "@/lib/storage/r2";
import { SUPPORTED_IMAGE_MIMES, getExtensionFromMime } from "@/lib/storage/interface";
import { isHashId } from "@/lib/utils/ids";

/**
 * Authenticated proxy for private R2 objects.
 *
 * Only exists for the `STORAGE_PROVIDER=r2` + no `R2_PUBLIC_URL_BASE` case
 * (see `R2StorageProvider`) — the bucket stays private, and this route holds
 * the R2 credentials so the browser never needs them. `local` serves its
 * images as real static files under `public/uploads/`, and `s3` always
 * returns a direct (CloudFront/bucket) URL, so neither needs this route.
 *
 * Images are immutable per hashId, so responses are cached for a year —
 * repeat views hit the platform's edge cache, not this function, keeping
 * the R2-egress cost advantage mostly intact after the first request.
 */

const SUPPORTED_EXTENSIONS = new Set(
  SUPPORTED_IMAGE_MIMES.map(getExtensionFromMime).filter((ext): ext is string => Boolean(ext)),
);

/** Only ever serve exactly what `R2StorageProvider.saveImage()` writes — `uploads/<hashId>.<ext>`. */
function isValidKey(key: string): boolean {
  const match = /^uploads\/([^/.]+)\.([a-z0-9]+)$/.exec(key);
  if (!match) return false;
  const [, hashId, ext] = match;
  return isHashId(hashId) && SUPPORTED_EXTENSIONS.has(ext);
}

type Params = { key: string[] };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  const { key: segments } = await params;
  const key = segments.join("/");

  if (!isValidKey(key)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const provider = StorageProviderFactory.getInstance();
  if (!(provider instanceof R2StorageProvider)) {
    // Active provider isn't R2 — this route has nothing to serve.
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const { body, contentType } = await provider.getImage(key);
    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "NoSuchKey") {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error(`[api/images] failed to fetch "${key}" from R2:`, err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
