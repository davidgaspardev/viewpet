/**
 * Test script for S3 storage provider.
 *
 * Usage:
 *   bun run test-s3-upload.ts
 *
 * Make sure to set the following environment variables:
 *   - AWS_REGION
 *   - AWS_S3_BUCKET
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *   - STORAGE_PROVIDER=s3 (or it will auto-detect in production)
 */

import { getStorageProvider } from "./src/lib/storage";

async function testS3Upload() {
  console.log("🧪 Testing S3 upload...\n");

  try {
    // Get the storage provider
    const storage = getStorageProvider();
    console.log("✓ Storage provider initialized\n");

    // Create a fake image File
    // In a real scenario, this would be an actual uploaded file
    const fakeImageData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const file = new File([fakeImageData], "test.png", {
      type: "image/png"
    });

    console.log("📦 Created test file:");
    console.log(`   Name: ${file.name}`);
    console.log(`   Type: ${file.type}`);
    console.log(`   Size: ${file.size} bytes\n`);

    // Generate a test hash ID
    const testHashId = `test-${Date.now()}`;
    console.log(`🔑 Using hash ID: ${testHashId}\n`);

    // Upload the file
    console.log("⬆️  Uploading to storage...");
    const url = await storage.saveImage(testHashId, file);

    console.log("\n✅ Upload successful!");
    console.log(`📸 Image URL: ${url}\n`);

    console.log("🎉 Test completed successfully!");
    console.log("\n💡 You can now:");
    console.log(`   1. Open the URL in your browser: ${url}`);
    console.log("   2. Verify the image appears correctly");
    console.log("   3. Check your S3 bucket to confirm the upload\n");

  } catch (error) {
    console.error("\n❌ Test failed:");

    if (error instanceof Error) {
      console.error(`   Error: ${error.message}\n`);

      // Provide helpful troubleshooting tips
      if (error.message.includes("bucket not configured")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Set AWS_S3_BUCKET environment variable");
        console.log("   - Example: export AWS_S3_BUCKET=your-bucket-name\n");
      } else if (error.message.includes("Access Denied")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Check IAM permissions (s3:PutObject, s3:PutObjectAcl)");
        console.log("   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
        console.log("   - See S3_SETUP.md for detailed setup instructions\n");
      } else if (error.message.includes("Invalid credentials")) {
        console.log("💡 Troubleshooting:");
        console.log("   - Verify AWS_ACCESS_KEY_ID is correct");
        console.log("   - Verify AWS_SECRET_ACCESS_KEY is correct");
        console.log("   - Check if IAM user has active access keys\n");
      } else {
        console.log("💡 For detailed troubleshooting, see S3_SETUP.md\n");
      }
    } else {
      console.error(`   ${String(error)}\n`);
    }

    process.exit(1);
  }
}

// Run the test
testS3Upload();
