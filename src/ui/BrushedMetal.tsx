import { useId } from "react";

/**
 * Light and grain of brushed steel, drawn with CSS and one SVG filter (no
 * image file). From the bottom layer up:
 *  - a conic gradient, the way a disc of brushed metal catches light around its
 *    centre;
 *  - horizontal hairlines of different periods (3, 5, 7 and 11px), so the
 *    lines do not repeat in an obvious rhythm;
 *  - a soft highlight at the top left.
 */
const SHEEN =
  "conic-gradient(from 200deg at 50% 50%, #b8bec6 0deg, #e9ecef 35deg, #c3c9d0 70deg, #f3f5f7 110deg, #b4bac2 160deg, #dfe3e7 210deg, #aab1ba 250deg, #eceff2 295deg, #bcc2ca 335deg, #b8bec6 360deg)";
const HIGHLIGHT =
  "radial-gradient(120% 90% at 22% 12%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)";
const HAIRLINES = [
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0 1px, rgba(255,255,255,0) 1px 3px)",
  "repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0 1px, rgba(0,0,0,0) 1px 5px)",
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 1px, rgba(255,255,255,0) 1px 7px)",
  "repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, rgba(0,0,0,0) 1px 11px)",
];
const STEEL = [HIGHLIGHT, ...HAIRLINES, SHEEN].join(", ");

type BrushedMetalProps = {
  /**
   * Shape, size and outer shadow, as classes (`rounded-full h-full w-full`,
   * ...). Not the position: the surface is always `relative`, which beats an
   * `absolute` here, so place it with a wrapper.
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
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60 mix-blend-overlay"
      >
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.85" numOctaves="3" seed="11" />
          {/* To grey and opaque, then more contrast around mid-grey. */}
          <feColorMatrix values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="2.2" intercept="-0.6" />
            <feFuncG type="linear" slope="2.2" intercept="-0.6" />
            <feFuncB type="linear" slope="2.2" intercept="-0.6" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>

      {/* Bevel: a lit upper edge and a shaded lower one. Apart from the surface so a `shadow-*` in `className` still works. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55),inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(0,0,0,0.2)]"
      />
    </div>
  );
}
