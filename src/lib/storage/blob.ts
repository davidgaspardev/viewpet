import { put } from "@vercel/blob";
import { IStorageProvider } from "./interface";

export class BlobStorageProvider implements IStorageProvider {
  async saveImage(hashId: string, file: File): Promise<string> {
    const blob = await put(hashId, file, {
      access: "public",
    });
    return blob.url;
  }
}
