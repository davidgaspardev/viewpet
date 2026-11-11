import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";
import { parseBaseUrl } from "@/lib/utils/base-url";

/** Where the illustration's QR image is served (see `src/app/home-qr.svg/route.ts`). */
export const HOME_QR_PATH = "/home-qr.svg";

const DEFAULT_SITE_URL = "https://viewpet.info";

/** What the illustration's QR Code opens when scanned: the site itself. Blank or invalid `SITE_URL` falls back to production. */
export function homeQrTarget(siteUrl: string | undefined): string {
  return parseBaseUrl(siteUrl) || DEFAULT_SITE_URL;
}

export function renderHomeQr(siteUrl: string | undefined): string {
  return renderQrSvg(homeQrTarget(siteUrl), {
    logoHref: LOGO_DATA_URI,
    color: "#1F2D3D",
    background: "#ffffff",
  });
}
