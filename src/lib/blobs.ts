import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Mock blob storage for pet pictures.
 *
 * MVP: writes to `public/uploads/<hashId>.<ext>` and returns the public
 * URL `/uploads/<hashId>.<ext>` (Next.js serves anything under `public/`
 * verbatim at the root). In production swap this for an S3/R2/GCS client
 * — keep `savePetImage(hashId, file): Promise<string>` as the surface and
 * the rest of the app (Server Action + KVS) doesn't care.
 *
 * The KVS still stores only a string URL — image bytes never end up in
 * pets.json. Mirrors the production split: blobs in object storage, the
 * pointer in the KVS.
 */

const UPLOADS_DIR = path.join(process.cwd(), "public/uploads");
const PUBLIC_PREFIX = "/uploads";

/** Accepted MIME types and the extension we'll persist them under. */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const SUPPORTED_IMAGE_MIMES = Object.keys(MIME_TO_EXT);
/** 5 MB. Same number is enforced client-side. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type SaveImageError = "invalid_type" | "too_large" | "empty";

export class SaveImageException extends Error {
  constructor(public code: SaveImageError) {
    super(`save_pet_image:${code}`);
  }
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

/** Remove any existing file matching `<hashId>.*` so re-uploads don't pile up. */
async function clearPrevious(hashId: string): Promise<void> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(UPLOADS_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
  const prefix = `${hashId}.`;
  for (const name of entries) {
    if (!name.startsWith(prefix)) continue;
    try {
      await fs.unlink(path.join(UPLOADS_DIR, name));
    } catch (err) {
      // Some sandboxed/mounted filesystems disallow unlink even for the
      // owner. The new write below will overwrite same-extension files
      // anyway; orphan files are a dev annoyance, not a correctness
      // issue. In production the storage backend handles deletion
      // normally.
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EPERM" && code !== "EACCES" && code !== "ENOENT") throw err;
    }
  }
}

/**
 * Persist an uploaded image and return the public URL to use in pets.json.
 * Throws `SaveImageException` for client-correctable problems.
 */
export async function savePetImage(
  hashId: string,
  file: File,
): Promise<string> {
  if (!file || file.size === 0) {
    throw new SaveImageException("empty");
  }
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    throw new SaveImageException("invalid_type");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new SaveImageException("too_large");
  }

  await ensureDir();
  await clearPrevious(hashId);

  const filename = `${hashId}.${ext}`;
  const target = path.join(UPLOADS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(target, buffer);

  return `${PUBLIC_PREFIX}/${filename}`;
}
