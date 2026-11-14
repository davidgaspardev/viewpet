"use client";

import { useEffect, useRef } from "react";

/** Opacity of the header's background once the page has scrolled `FADE_DISTANCE`. */
export const MAX_TINT = 0.32;
/** Pixels of scroll over which the background goes from nothing to `MAX_TINT`. */
export const FADE_DISTANCE = 120;

/** Opacity of the header's background at a scroll position: 0 at the top, rising in a straight line up to `MAX_TINT`. */
export function tintAt(scrollY: number): number {
  const progress = Math.min(Math.max(scrollY / FADE_DISTANCE, 0), 1);
  return progress * MAX_TINT;
}

const toColor = (alpha: number) => `rgba(255, 255, 255, ${alpha.toFixed(3)})`;

/**
 * The header's background, as a layer behind its content, that starts clear and
 * whitens as the page scrolls. The header keeps its blur at all times, so what
 * passes under it stays readable even with the light tint. The colour is set on
 * the element directly, once per frame, instead of through state: a scroll does
 * not re-render anything.
 */
export function HeaderTint() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const paint = () => {
      frame = 0;
      if (layer.current) layer.current.style.backgroundColor = toColor(tintAt(window.scrollY));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint(); // a reload keeps the scroll position, so start from where the page is
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={layer}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ backgroundColor: toColor(0) }}
    />
  );
}
