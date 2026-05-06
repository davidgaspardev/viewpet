import type { IStorageProvider } from "./interface";
import {
  MAX_IMAGE_BYTES,
  SaveImageException,
  getExtensionFromMime,
} from "./interface";

/**
 * Firebase Storage provider.
 *
 * Uploads images to Firebase Storage and returns public URLs.
 *
 * Environment variables required:
 * - FIREBASE_STORAGE_BUCKET: Your Firebase storage bucket (e.g., "your-app.appspot.com")
 * - FIREBASE_SERVICE_ACCOUNT_KEY: JSON string of service account credentials
 *   OR use Application Default Credentials (ADC) in Google Cloud environments
 *
 * Features:
 * - Automatic public URL generation
 * - Built-in CDN distribution
 * - Automatic re-upload handling (overwrites existing files)
 * - Proper content-type metadata
 *
 * Suitable for:
 * - Production deployments
 * - Multi-server/serverless environments
 * - Global CDN distribution
 * - High-scale applications
 */
export class FirebaseStorageProvider implements IStorageProvider {
  private bucket: any; // admin.storage.Bucket
  private readonly bucketName: string;
  private readonly basePath: string;

  constructor(
    bucketName?: string,
    basePath: string = "uploads",
  ) {
    this.bucketName = bucketName || process.env.FIREBASE_STORAGE_BUCKET || "";
    this.basePath = basePath;

    if (!this.bucketName) {
      throw new Error(
        "Firebase Storage bucket not configured. Set FIREBASE_STORAGE_BUCKET environment variable.",
      );
    }

    // Lazy initialization - only import firebase-admin when needed
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK.
   * Uses service account key from env or Application Default Credentials.
   */
  private initializeFirebase(): void {
    // Dynamic import to avoid loading firebase-admin in environments that don't need it
    const admin = require("firebase-admin");

    // Check if already initialized
    if (!admin.apps.length) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountKey) {
        // Initialize with service account credentials
        try {
          const credentials = JSON.parse(serviceAccountKey);
          admin.initializeApp({
            credential: admin.credential.cert(credentials),
            storageBucket: this.bucketName,
          });
        } catch (err) {
          throw new Error(
            `Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } else {
        // Use Application Default Credentials (for Google Cloud environments)
        admin.initializeApp({
          storageBucket: this.bucketName,
        });
      }
    }

    this.bucket = admin.storage().bucket(this.bucketName);
  }

  /**
   * Save an uploaded image to Firebase Storage.
   *
   * @param hashId - Unique identifier for this pet
   * @param file - The uploaded File object
   * @returns Public Firebase Storage URL
   */
  async saveImage(hashId: string, file: File): Promise<string> {
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
      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Create file path in Firebase Storage
      const filename = `${hashId}.${ext}`;
      const filepath = `${this.basePath}/${filename}`;
      const fileRef = this.bucket.file(filepath);

      // Upload with metadata
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            uploadedAt: new Date().toISOString(),
            hashId: hashId,
          },
        },
        // This will overwrite existing files with the same name
        resumable: false,
      });

      // Make the file publicly accessible
      await fileRef.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filepath}`;
      return publicUrl;
    } catch (err) {
      // Wrap Firebase errors with more context
      if (err instanceof Error) {
        throw new Error(
          `Firebase Storage upload failed: ${err.message}`,
        );
      }
      throw new Error(
        `Firebase Storage upload failed: ${String(err)}`,
      );
    }
  }
}
