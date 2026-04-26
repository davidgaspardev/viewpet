import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bestforpet.com.au",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Pet picture uploads cap at 5 MB (see MAX_IMAGE_BYTES in src/lib/blobs.ts).
      // The multipart envelope adds overhead, so 6 MB leaves a comfortable margin.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
