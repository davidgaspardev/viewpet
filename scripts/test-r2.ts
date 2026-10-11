/**
 * Test script for the Cloudflare R2 storage provider.
 *
 * Usage:
 *   STORAGE_PROVIDER=r2 bun run scripts/test-r2.ts
 *
 * Make sure to set the following environment variables:
 *   - R2_ACCOUNT_ID
 *   - R2_ACCESS_KEY_ID
 *   - R2_SECRET_ACCESS_KEY
 *   - R2_BUCKET
 *   - R2_ACCESS_SUBDOMAIN (the bucket's pub-<hash>.r2.dev subdomain, or a
 *     custom domain — requires public access enabled in the Cloudflare
 *     dashboard first)
 *   - STORAGE_PROVIDER=r2
 */

import { StorageProviderFactory } from "../src/lib/storage";
import { generateHashId } from "../src/lib/utils/ids";

async function testR2Upload() {
  console.log("🧪 Testing R2 upload...\n");

  try {
    const storage = StorageProviderFactory.getInstance();
    console.log("✓ Storage provider initialized\n");

    // Fake image bytes — in a real scenario this would be an uploaded File.
    const fakeImageData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );

    const file = new File([fakeImageData], "test.png", {
      type: "image/png",
    });

    console.log("📦 Created test file:");
    console.log(`   Name: ${file.name}`);
    console.log(`   Type: ${file.type}`);
    console.log(`   Size: ${file.size} bytes\n`);

    // Must pass isHashId() — R2StorageProvider validates it the same way
    // the real upload path does, so a `test-<timestamp>`-shaped id would
    // fail validation before ever reaching R2.
    const testHashId = generateHashId();
    console.log(`🔑 Using hash ID: ${testHashId}\n`);

    console.log("⬆️  Uploading to R2...");
    const url = await storage.saveImage(testHashId, file);

    console.log("\n✅ Upload successful!");
    console.log(`📸 Image URL: ${url}\n`);

    console.log("🎉 Test completed successfully!");
    console.log("\n💡 You can now:");
    console.log(`   1. Open the URL in your browser: ${url}`);
    console.log("   2. Verify the image appears correctly");
    console.log("   3. Check your R2 bucket (Cloudflare dashboard) to confirm the upload\n");
  } catch (error) {
    console.error("\n❌ Test failed:");

    if (error instanceof Error) {
      console.error(`   Error: ${error.message}\n`);

      if (error.message.includes("bucket not configured")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Set R2_BUCKET environment variable\n");
      } else if (error.message.includes("account not configured")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Set R2_ACCOUNT_ID to your Cloudflare account id\n");
      } else if (error.message.includes("credentials not configured")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY");
        console.log("   - Generate an R2 API token in the Cloudflare dashboard\n");
      } else if (error.message.includes("public access not configured")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Enable public access on the bucket (Settings → Public access)");
        console.log("   - Set R2_ACCESS_SUBDOMAIN to the resulting pub-<hash>.r2.dev URL\n");
      } else if (error.message.includes("Access Denied")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Check the R2 API token has Object Read & Write permissions\n");
      } else {
        console.log("💡 See src/lib/storage/README.md for R2 setup instructions\n");
      }
    } else {
      console.error(`   ${String(error)}\n`);
    }

    process.exit(1);
  }
}

testR2Upload();
