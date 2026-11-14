import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";
import { parseBaseUrl } from "@/lib/utils/base-url";

/** Id of the `<symbol>` that holds the QR Code, for the `<use>` in each tag illustration. */
export const HOME_QR_ID = "home-qr";

const DEFAULT_SITE_URL = "https://viewpet.info";

/** What the illustration's QR Code opens when scanned: the site itself. Blank or invalid `SITE_URL` falls back to production. */
export function homeQrTarget(siteUrl: string | undefined): string {
  return parseBaseUrl(siteUrl) || DEFAULT_SITE_URL;
}

/** The tag's QR Code, as the admin prints it (round dots, logo in the middle) but in the engraving's dark steel-grey. */
export function renderHomeQr(siteUrl: string | undefined): string {
  return renderQrSvg(homeQrTarget(siteUrl), {
    logoHref: LOGO_DATA_URI,
    color: "#222b34",
    background: "#ffffff",
  });
}

const SVG_ROOT = /^<svg\b[^>]*?\sviewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>$/;

/**
 * The QR Code split into its `viewBox` and its drawing, to be defined once as
 * a `<symbol>` and drawn wherever it is needed (the hero and the tag section
 * both show a tag), instead of repeating its ~20 KB of markup in each.
 */
export function homeQrSymbol(siteUrl: string | undefined): { viewBox: string; content: string } {
  const match = SVG_ROOT.exec(renderHomeQr(siteUrl));
  if (!match) throw new Error("The QR Code renderer returned something other than an <svg>.");
  return { viewBox: match[1]!, content: match[2]! };
}
