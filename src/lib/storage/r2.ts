import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./interface";
import {
  MAX_IMAGE_BYTES,
  SaveImageException,
  getExtensionFromMime,
} from "./interface";
import { isHashId } from "../utils/ids";

/** Route that proxies reads through our own server — see `getImage()` below. */
const IMAGE_PROXY_PATH = "/api/images";

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
 *
 * Optional:
 * - R2_PUBLIC_URL_BASE: base URL images are served from directly (custom
 *   domain, or the bucket's `pub-<hash>.r2.dev` dev subdomain), once public
 *   access is actually enabled and confirmed working in the Cloudflare
 *   dashboard. When unset, `saveImage()` returns a URL under
 *   `/api/images/<key>` instead — our own route (`src/app/api/images/`)
 *   fetches the object with the credentials above and serves the bytes.
 *   R2 buckets are private by default and public access is an explicit,
 *   easy-to-get-wrong dashboard step, so the proxy is the safe default —
 *   it always works, at the cost of routing image bytes through our own
 *   server instead of Cloudflare's CDN. Set `R2_PUBLIC_URL_BASE` once
 *   public access is confirmed to skip that hop and get R2's full
 *   zero-egress benefit back.
 *
 * Suitable for:
 * - Public, immutable assets served at scale (zero egress fees, once
 *   `R2_PUBLIC_URL_BASE` is in play)
 * - Production deployments already comfortable with the S3 API
 */
export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private readonly bucketName: string;
  private readonly basePath: string;
  private readonly publicUrlBase?: string;

  constructor(bucketName?: string, basePath: string = "uploads") {
    this.bucketName = bucketName || process.env.R2_BUCKET || "";
    this.basePath = basePath;
    this.publicUrlBase = process.env.R2_PUBLIC_URL_BASE || undefined;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

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
   * @returns `R2_PUBLIC_URL_BASE` + key when configured, otherwise a URL
   *   under our own `/api/images/<key>` proxy route.
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

  /**
   * Fetch an object's bytes directly from R2 using our own credentials.
   * Used by the `/api/images/[...key]` route to serve images when
   * `R2_PUBLIC_URL_BASE` isn't configured (bucket stays private).
   *
   * @throws Error with `.name === "NoSuchKey"` when the object doesn't exist
   *   (same shape the AWS SDK throws, so callers can branch on it the same way).
   */
  async getImage(key: string): Promise<{ body: Uint8Array; contentType: string }> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (!result.Body) {
      throw new Error(`R2 object "${key}" has no body`);
    }
    const body = await result.Body.transformToByteArray();
    return { body, contentType: result.ContentType ?? "application/octet-stream" };
  }

  /**
   * Build the URL for the uploaded file — direct to R2 when
   * `R2_PUBLIC_URL_BASE` is configured, otherwise through our own proxy.
   */
  private buildPublicUrl(key: string): string {
    if (this.publicUrlBase) {
      const baseUrl = this.publicUrlBase.replace(/\/$/, "");
      return `${baseUrl}/${key}`;
    }
    return `${IMAGE_PROXY_PATH}/${key}`;
  }
}
