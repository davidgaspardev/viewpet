import { useId } from "react";

/**
 * Light and grain of brushed steel, kept quiet on purpose: it has to sit in a
 * minimal page, not be the loudest thing on it. Drawn with CSS and one SVG
 * filter (no image file). From the bottom layer up:
 *  - a conic gradient in a narrow band of greys, the way a disc of brushed
 *    metal catches light around its centre;
 *  - one set of horizontal hairlines, barely there;
 *  - a soft highlight at the top left.
 */
const SHEEN =
  "conic-gradient(from 200deg at 50% 50%, #979da4 0deg, #b0b5bb 50deg, #9aa0a7 120deg, #b3b8be 200deg, #959ba2 270deg, #adb2b8 320deg, #979da4 360deg)";
const HIGHLIGHT =
  "radial-gradient(120% 90% at 22% 12%, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)";
const HAIRLINES =
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, rgba(255,255,255,0) 1px 4px)";
const STEEL = [HIGHLIGHT, HAIRLINES, SHEEN].join(", ");

type BrushedMetalProps = {
  /**
   * Shape and size, as classes (`rounded-full h-full w-full`, a `mask-image`
   * to cut a hole, ...). Not the position: the surface is always `relative`,
   * which beats an `absolute` here, so place it with a wrapper. Nor the outer
   * shadow: a `shadow-*` here would be cut by a mask, so put a
   * `drop-shadow` on the wrapper, which follows the cut shape.
   */
  className?: string;
  /** What is engraved on the metal. It sits under the grain, so it looks etched into it. */
  children?: React.ReactNode;
};

/**
 * A brushed-steel surface: the face of the tag, drawn instead of photographed.
 * It takes the shape its `className` gives it and clips what it holds to it.
 *
 * The streaks come from `feTurbulence` stretched along the x axis (a high
 * frequency down the page, a low one across it), blended over the gradients
 * and over the children, so an engraved QR Code gets the same grain as the
 * metal around it. Every decorative layer is `aria-hidden`; put the meaning in
 * an `aria-label` on the parent.
 */
export function BrushedMetal({ children, className = "" }: BrushedMetalProps) {
  // One filter per surface: the id is only valid once per document.
  const filterId = `brushed-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ backgroundImage: STEEL }}>
      {children}

      <svg
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16] mix-blend-overlay"
      >
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.005 0.55" numOctaves="2" seed="11" />
          {/* To grey and opaque, then a little more contrast around mid-grey. */}
          <feColorMatrix values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.6" intercept="-0.3" />
            <feFuncG type="linear" slope="1.6" intercept="-0.3" />
            <feFuncB type="linear" slope="1.6" intercept="-0.3" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>

      {/* Bevel: a thin lit edge and a faint shade at the bottom. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5),inset_0_-3px_6px_rgba(0,0,0,0.07)]"
      />
    </div>
  );
}
