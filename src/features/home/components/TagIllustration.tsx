import Image from "next/image";

import { HOME_QR_PATH } from "../qr";

type TagIllustrationProps = {
  /** Name shown on the tag. */
  name: string;
  /** Swing slowly from the ring (motion-safe only). */
  swing?: boolean;
  className?: string;
};

/**
 * A flat illustration of the product: a dark enamel pendant hanging from its
 * ring, with the pet's name and a QR Code. Drawn with CSS (no 3D scene); the QR
 * is one small SVG file shared by every copy of the illustration.
 */
export function TagIllustration({ name, swing = false, className = "" }: TagIllustrationProps) {
  return (
    <div
      role="img"
      aria-label={`Plaquinha de metal com o nome ${name} e um QR Code`}
      className={`relative aspect-[4/5] w-full max-w-[17rem] origin-top ${
        swing ? "motion-safe:animate-sway" : ""
      } ${className}`}
    >
      {/* Ring: its lower half hides behind the pendant. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-[27%] w-[21%] -translate-x-1/2 rounded-full border-[7px] border-[#c4ccd4] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 flex aspect-square flex-col items-center justify-center gap-[5%] overflow-hidden rounded-full bg-ink bg-[url(/noise-light.png)] shadow-[0_28px_44px_-14px_rgba(31,45,61,0.6)] ring-1 ring-white/10"
      >
        {/* Engraved rim and a soft highlight, so the disc reads as metal. */}
        <div className="absolute inset-[4.5%] rounded-full border border-white/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.24),transparent_55%)]" />

        <span className="relative text-lg font-semibold tracking-[0.4em] text-white/90">
          <span className="pl-[0.4em]">{name.toUpperCase()}</span>
        </span>
        <div className="relative aspect-square w-[50%] rounded-xl bg-white p-[3%] shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
          <Image src={HOME_QR_PATH} alt="" width={256} height={256} unoptimized className="h-full w-full" />
        </div>
        <span className="relative text-[0.6rem] font-medium uppercase tracking-[0.28em] text-white/65">
          Escaneie e ligue
        </span>
      </div>
    </div>
  );
}
