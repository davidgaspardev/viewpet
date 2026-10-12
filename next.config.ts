import type { NextConfig } from "next";

import { buildQrRedirects } from "./src/lib/utils/qr-redirects";

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
  // Short QR host (QR_BASE_URL) → the pet page. Evaluated at build time, so
  // QR_BASE_URL and SITE_URL must be set when building; a no-op when they aren't.
  async redirects() {
    const redirects = buildQrRedirects(process.env);
    if (process.env.QR_BASE_URL?.trim() && redirects.length === 0) {
      console.warn(
        "[qr-host] QR_BASE_URL is set but SITE_URL (or QR_BASE_URL itself) is missing or invalid; no redirect was registered.",
      );
    }
    return redirects;
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
