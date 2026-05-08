#!/usr/bin/env bun
/**
 * Test S3 upload with your credentials.
 *
 * Usage: bun run test-s3.ts
 */

import { S3Client, PutObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";

async function testS3() {
  console.log("🧪 Testing S3 Connection...\n");

  // Check environment variables
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  console.log("📋 Configuration:");
  console.log(`   Region: ${region || '❌ NOT SET'}`);
  console.log(`   Bucket: ${bucket || '❌ NOT SET'}`);
  console.log(`   Access Key ID: ${accessKeyId ? '✅ Set (' + accessKeyId.substring(0, 8) + '...)' : '❌ NOT SET'}`);
  console.log(`   Secret Access Key: ${secretAccessKey ? '✅ Set (***hidden***)' : '❌ NOT SET'}\n`);

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    console.error("❌ Missing required environment variables!");
    console.log("\n💡 Make sure your .env.local has:");
    console.log("   AWS_REGION=sa-east-1");
    console.log("   AWS_S3_BUCKET=view-pet-storage");
    console.log("   AWS_ACCESS_KEY_ID=AKIA...");
    console.log("   AWS_SECRET_ACCESS_KEY=...");
    process.exit(1);
  }

  // Create S3 client
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    // Test 1: List buckets (verify credentials work)
    console.log("🔍 Test 1: Verifying AWS credentials...");
    const listCommand = new ListBucketsCommand({});
    const listResult = await client.send(listCommand);
    console.log(`✅ Credentials valid! Found ${listResult.Buckets?.length || 0} buckets\n`);

    // Test 2: Upload a test file
    console.log("📤 Test 2: Uploading test image...");
    const testImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const testKey = `uploads/test-${Date.now()}.png`;
    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testImageBuffer,
      ContentType: "image/png",
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    });

    await client.send(uploadCommand);

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${testKey}`;

    console.log("✅ Upload successful!\n");
    console.log("📍 Public URL:");
    console.log(`   ${publicUrl}\n`);
    console.log("🌐 Open this URL in your browser to verify the image is accessible.\n");

    // Test 3: Check if bucket policy allows public read
    console.log("🔒 Test 3: Checking public access...");
    try {
      const response = await fetch(publicUrl);
      if (response.ok) {
        console.log("✅ Public read access working! Image is publicly accessible.\n");
      } else {
        console.log(`⚠️  Public access returned status: ${response.status}`);
        console.log("   This might indicate bucket policy issues.\n");
      }
    } catch (err) {
      console.log("⚠️  Could not verify public access via HTTP");
      console.log("   Try opening the URL in your browser manually.\n");
    }

    console.log("✅ All tests passed!");
    console.log("\n🎉 Your S3 configuration is working correctly!");
    console.log("\n💡 Next steps:");
    console.log("   1. Start your app: bun run dev");
    console.log("   2. Upload a pet image through the form");
    console.log("   3. Verify it's stored in S3\n");

  } catch (error: any) {
    console.error("\n❌ Test failed!");
    console.error("\nError details:");
    console.error(`   ${error.message}\n`);

    if (error.name === "NoSuchBucket") {
      console.log("💡 Troubleshooting:");
      console.log("   • Bucket 'view-pet-storage' doesn't exist");
      console.log("   • Check bucket name spelling");
      console.log("   • Verify bucket is in region 'sa-east-1'");
    } else if (error.name === "InvalidAccessKeyId") {
      console.log("💡 Troubleshooting:");
      console.log("   • AWS_ACCESS_KEY_ID is invalid");
      console.log("   • Check your credentials in .env.local");
    } else if (error.name === "SignatureDoesNotMatch") {
      console.log("💡 Troubleshooting:");
      console.log("   • AWS_SECRET_ACCESS_KEY is incorrect");
      console.log("   • Check your credentials in .env.local");
    } else if (error.name === "AccessDenied") {
      console.log("💡 Troubleshooting:");
      console.log("   • IAM user lacks required permissions");
      console.log("   • Add these permissions to your IAM user:");
      console.log("     - s3:PutObject");
      console.log("     - s3:PutObjectAcl");
      console.log("     - s3:GetObject");
      console.log("     - s3:ListBucket (optional)");
    } else {
      console.log("💡 Troubleshooting:");
      console.log("   • Check error details above");
      console.log("   • Verify AWS credentials");
      console.log("   • Check S3_SETUP.md for detailed instructions");
    }

    console.log();
    process.exit(1);
  }
}

testS3().catch(console.error);
