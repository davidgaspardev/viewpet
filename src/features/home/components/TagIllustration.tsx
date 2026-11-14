import { BrushedMetal } from "@/ui/BrushedMetal";

import { HOME_QR_ID } from "../qr";

type TagIllustrationProps = {
  /** The code engraved under the QR Code: the id in the address of the pet's page. */
  tagId: string;
  /** Swing slowly from the hole (motion-safe only). */
  swing?: boolean;
  className?: string;
};

/**
 * The back of the product: a brushed-steel tag with the QR Code on it, the
 * tag's id underneath and, above the QR Code, the hole for the cord. There is
 * no pet name on it: the tag is the same for every pet, and the page behind the
 * QR Code is what says whose it is. Drawn with CSS and SVG, no image file; the
 * QR Code is the page's one `<symbol>` (see `HomeQrDefs`), which has to be on
 * the page.
 *
 * The hole is cut, not painted: a mask removes it from the steel, so what is
 * behind the tag shows through it. The mask and the rim around it both read the
 * hole's place and size from the two variables on the root. The tag's shadow is
 * a `drop-shadow` on the root (a box-shadow would be cut by the mask), so it
 * follows the hole too.
 */
export function TagIllustration({ tagId, swing = false, className = "" }: TagIllustrationProps) {
  return (
    <div
      role="img"
      aria-label={`Plaquinha de aço escovado com um QR Code e, abaixo dele, o código ${tagId}`}
      className={`relative aspect-square w-full max-w-[17rem] origin-[50%_var(--hole-y)] [--hole-r:3.5%] [--hole-y:10.5%] [filter:drop-shadow(0_1px_1px_rgba(31,45,61,0.22))_drop-shadow(0_16px_16px_rgba(31,45,61,0.16))] ${
        swing ? "motion-safe:animate-sway" : ""
      } ${className}`}
    >
      <BrushedMetal className="h-full w-full rounded-full [mask-image:radial-gradient(ellipse_var(--hole-r)_var(--hole-r)_at_50%_var(--hole-y),transparent_95%,#000_100%)]">
        <div aria-hidden="true" className="absolute inset-0">
          {/*
            The symbol carries its own blank margin (about a ninth of its width on each side), so its
            dots take about three quarters of it: they run from 20% to 79% of the tag. The id sits
            just under them, and the two together are centred a little below the middle, in the
            room the hole leaves. White background and rings multiply away against the steel; only
            the dots stay dark.
          */}
          <svg
            aria-hidden="true"
            focusable="false"
            className="absolute left-[12%] top-[12%] aspect-square w-[76%] mix-blend-multiply"
          >
            <use href={`#${HOME_QR_ID}`} />
          </svg>
          <span className="absolute inset-x-0 top-[81.5%] text-center font-mono text-[0.7rem] font-medium leading-none tracking-[0.2em] text-[#2b333c] [text-shadow:0_1px_0_rgba(255,255,255,0.65)]">
            {tagId}
          </span>
        </div>
      </BrushedMetal>

      {/* The hole's edge: a lit lip on the steel around it and a shade inside, on the side the light comes from. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[var(--hole-y)] h-[calc(var(--hole-r)*2)] w-[calc(var(--hole-r)*2)] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.55),inset_0_1.5px_2px_rgba(31,45,61,0.3)]"
      />
    </div>
  );
}
