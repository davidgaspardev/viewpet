import { BrushedMetal } from "@/ui/BrushedMetal";

import { HOME_QR_ID } from "../qr";

type TagIllustrationProps = {
  /** The code engraved under the QR Code: the id in the address of the pet's page. */
  tagId: string;
  /** Swing slowly from the ring (motion-safe only). */
  swing?: boolean;
  className?: string;
};

/**
 * The back of the product: a brushed-steel tag hanging from its ring, with the
 * QR Code engraved on it and the tag's id underneath. There is no pet name on
 * it: the tag is the same for every pet, and the page behind the QR Code is
 * what says whose it is. Drawn with CSS and SVG, no image file; the QR Code is
 * the page's one `<symbol>` (see `HomeQrDefs`), which has to be on the page.
 */
export function TagIllustration({ tagId, swing = false, className = "" }: TagIllustrationProps) {
  return (
    <div
      role="img"
      aria-label={`Plaquinha de aço escovado com um QR Code e, abaixo dele, o código ${tagId}`}
      className={`relative aspect-[4/5] w-full max-w-[17rem] origin-top ${
        swing ? "motion-safe:animate-sway" : ""
      } ${className}`}
    >
      {/* Ring: its lower half hides behind the tag. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-[27%] w-[21%] -translate-x-1/2 rounded-full border-[7px] border-[#aab1ba] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.25)]"
      />

      {/* The placement is the wrapper's: `BrushedMetal` is `relative` itself, so a position class on it would lose. */}
      <div className="absolute inset-x-0 bottom-0 aspect-square">
        <BrushedMetal className="h-full w-full rounded-full shadow-[0_28px_44px_-14px_rgba(31,45,61,0.55)] ring-1 ring-black/10">
          <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-[4%] pt-[5%]">
            {/* White background and rings multiply away against the steel; only the dots stay dark. */}
            <svg aria-hidden="true" focusable="false" className="aspect-square w-[58%] mix-blend-multiply">
              <use href={`#${HOME_QR_ID}`} />
            </svg>
            <span className="font-mono text-[0.7rem] font-medium tracking-[0.24em] text-[#2b333c] [text-shadow:0_1px_0_rgba(255,255,255,0.65)]">
              {tagId}
            </span>
          </div>
        </BrushedMetal>
      </div>
    </div>
  );
}
