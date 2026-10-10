import { S3Client, PutObjectCommand, type S3ClientConfig } from "@aws-sdk/client-s3";
import type { StorageProvider } from "./interface";
import {
  MAX_IMAGE_BYTES,
  SaveImageException,
  getExtensionFromMime,
} from "./interface";
import { isHashId } from "../utils/ids";

/**
 * Cloudflare R2 storage provider.
 *
 * R2 implements the S3 API, so this reuses `@aws-sdk/client-s3` pointed at
 * the R2 account endpoint instead of AWS — same upload path as
 * `S3StorageProvider`, different credentials and public URL shape.
 *
 * Environment variables required:
 * - R2_ACCOUNT_ID: Cloudflare account id (builds the R2 endpoint)
 * - R2_ACCESS_KEY_ID: R2 API token access key
 * - R2_SECRET_ACCESS_KEY: R2 API token secret
 * - R2_BUCKET: R2 bucket name
 * - R2_PUBLIC_URL_BASE: base URL images are served from (custom domain, or
 *   the bucket's `pub-<hash>.r2.dev` dev subdomain). Unlike S3, R2 has no
 *   canonical public URL derivable from account id + bucket name — the
 *   bucket's public access has to be enabled explicitly and this value
 *   copied from the Cloudflare dashboard, so there's no safe default.
 *
 * Suitable for:
 * - Public, immutable assets served at scale (zero egress fees)
 * - Production deployments already comfortable with the S3 API
 */
export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private readonly bucketName: string;
  private readonly basePath: string;
  private readonly publicUrlBase: string;

  constructor(bucketName?: string, basePath: string = "uploads") {
    this.bucketName = bucketName || process.env.R2_BUCKET || "";
    this.basePath = basePath;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.publicUrlBase = process.env.R2_PUBLIC_URL_BASE || "";

    if (!this.bucketName) {
      throw new Error("R2 bucket not configured. Set R2_BUCKET environment variable.");
    }
    if (!accountId) {
      throw new Error("R2 account not configured. Set R2_ACCOUNT_ID environment variable.");
    }
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2 credentials not configured. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables.",
      );
    }
    if (!this.publicUrlBase) {
      throw new Error(
        "R2 public URL not configured. Set R2_PUBLIC_URL_BASE to the bucket's public domain.",
      );
    }

    const clientConfig: S3ClientConfig = {
      // R2 ignores the region value but the S3 SDK requires one — "auto"
      // is Cloudflare's documented placeholder.
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      // R2's S3 API is path-style only (no per-bucket virtual-hosted DNS).
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    };

    this.client = new S3Client(clientConfig);
  }

  /**
   * Save an uploaded image to R2.
   *
   * @param hashId - Unique identifier for this pet
   * @param file - The uploaded File object
   * @returns Public URL under `R2_PUBLIC_URL_BASE`
   */
  async saveImage(hashId: string, file: File): Promise<string> {
    // Validate hashId to prevent path traversal and key manipulation
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

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      const filename = `${hashId}.${ext}`;
      const key = `${this.basePath}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Cache for 1 year (immutable content)
        CacheControl: "public, max-age=31536000, immutable",
        // Note: public access is controlled by the bucket's public-access
        // setting in the Cloudflare dashboard, not by an object ACL.
      });

      await this.client.send(command);

      return this.buildPublicUrl(key);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`R2 upload failed: ${err.message}`);
      }
      throw new Error(`R2 upload failed: ${String(err)}`);
    }
  }

  /** Build the public URL for the uploaded file under `R2_PUBLIC_URL_BASE`. */
  private buildPublicUrl(key: string): string {
    const baseUrl = this.publicUrlBase.replace(/\/$/, "");
    return `${baseUrl}/${key}`;
  }
}
