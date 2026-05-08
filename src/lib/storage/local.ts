import { promises as fs } from "node:fs";
import path from "node:path";
import type { IStorageProvider } from "./interface";
import {
  MAX_IMAGE_BYTES,
  SaveImageException,
  getExtensionFromMime,
} from "./interface";
import { isHashId } from "../ids";

/**
 * Local filesystem storage provider.
 *
 * Stores images in `public/uploads/<hashId>.<ext>` and returns URLs like
 * `/uploads/<hashId>.<ext>`. Next.js serves anything under `public/`
 * verbatim at the root path.
 *
 * Suitable for:
 * - Local development
 * - Single-server deployments
 * - Prototypes and MVPs
 *
 * Not suitable for:
 * - Multi-server deployments (no shared filesystem)
 * - Serverless/edge deployments
 * - High-scale production (use cloud storage instead)
 */
export class LocalStorageProvider implements IStorageProvider {
  private readonly uploadsDir: string;
  private readonly publicPrefix: string;

  constructor(
    uploadsDir: string = path.join(process.cwd(), "public/uploads"),
    publicPrefix: string = "/uploads",
  ) {
    this.uploadsDir = uploadsDir;
    this.publicPrefix = publicPrefix;
  }

  /**
   * Save an uploaded image to local filesystem.
   *
   * @param hashId - Unique identifier for this pet
   * @param file - The uploaded File object
   * @returns Public URL (e.g., "/uploads/abc123.jpg")
   */
  async saveImage(hashId: string, file: File): Promise<string> {
    // Validate hashId to prevent path traversal attacks
    if (!isHashId(hashId)) {
      throw new Error("Invalid hashId format");
    }

    // Validate file
    if (!file || file.size === 0) {
      throw new SaveImageException("empty");
    }

    const ext = getExtensionFromMime(file.type);
    if (!ext) {
      throw new SaveImageException("invalid_type");
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new SaveImageException("too_large");
    }

    // Ensure directory exists
    await this.ensureDir();

    // Remove any previous files for this hashId
    await this.clearPrevious(hashId);

    // Write the file
    const filename = `${hashId}.${ext}`;
    const target = path.join(this.uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(target, buffer);

    // Return public URL
    return `${this.publicPrefix}/${filename}`;
  }

  /**
   * Ensure the uploads directory exists.
   */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.uploadsDir, { recursive: true });
  }

  /**
   * Remove any existing file matching `<hashId>.*` so re-uploads don't pile up.
   */
  private async clearPrevious(hashId: string): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.uploadsDir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }

    const prefix = `${hashId}.`;
    for (const name of entries) {
      if (!name.startsWith(prefix)) continue;
      try {
        await fs.unlink(path.join(this.uploadsDir, name));
      } catch (err) {
        // Some sandboxed/mounted filesystems disallow unlink even for the
        // owner. The new write below will overwrite same-extension files
        // anyway; orphan files are a dev annoyance, not a correctness
        // issue. In production the storage backend handles deletion
        // normally.
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "EPERM" && code !== "EACCES" && code !== "ENOENT") {
          throw err;
        }
      }
    }
  }
}
