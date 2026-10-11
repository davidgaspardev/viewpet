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
  async headers() {
    return [
      {
        // The admin page relies on cached Basic-auth credentials, so keep it
        // out of other sites' iframes (clickjacking on the Generate button).
        source: "/admin",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
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
