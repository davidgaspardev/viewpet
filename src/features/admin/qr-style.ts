import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import type { QrSvgOptions } from "@/lib/qrcode/render";

/** How the admin's QR codes are drawn. */
export type QrStyle = {
  /** The ViewPet logo in the middle of the code. */
  logo: boolean;
  /** Round dots; off is the standard code of square modules. */
  dots: boolean;
};

/** Today's look: round dots with the logo in the middle. */
export const DEFAULT_QR_STYLE: Readonly<QrStyle> = Object.freeze({ logo: true, dots: true });

/** Options for `renderQrSvg` that draw the tag for pet `id` in the given style. */
export function tagQrOptions(style: Readonly<QrStyle>, id: string): QrSvgOptions {
  return { logoHref: style.logo ? LOGO_DATA_URI : undefined, dots: style.dots, label: id };
}
