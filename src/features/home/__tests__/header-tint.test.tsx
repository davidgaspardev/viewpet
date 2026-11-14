import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { FADE_DISTANCE, MAX_TINT, tintAt } from "../components/HeaderTint";
import { HomeHeader } from "../components/HomeHeader";

describe("tintAt", () => {
  test("is clear at the top of the page and 0.32 at most", () => {
    expect(tintAt(0)).toBe(0);
    expect(MAX_TINT).toBe(0.32);
    expect(tintAt(FADE_DISTANCE)).toBeCloseTo(0.32, 10);
    expect(tintAt(FADE_DISTANCE * 10)).toBeCloseTo(0.32, 10);
  });

  test("rises in a straight line in between", () => {
    expect(tintAt(FADE_DISTANCE / 2)).toBeCloseTo(0.16, 10);
    expect(tintAt(FADE_DISTANCE / 4)).toBeCloseTo(0.08, 10);
    expect(tintAt(30)).toBeLessThan(tintAt(60));
  });

  test("never goes below zero, as when a phone overscrolls past the top", () => {
    expect(tintAt(-80)).toBe(0);
  });
});

describe("HomeHeader background", () => {
  const html = renderToStaticMarkup(<HomeHeader demoHref="/tag/x" />);

  test("is clear before the page has scrolled, with no fixed tint of its own", () => {
    expect(html).toContain('style="background-color:rgba(255, 255, 255, 0.000)"');
    expect(html).not.toMatch(/\bbg-white\//);
  });

  test("keeps its blur, so what scrolls under it stays readable", () => {
    expect(html).toContain("backdrop-blur-md");
  });

  test("the tint layer is behind the content and takes no clicks", () => {
    const layer = html.match(/<div[^>]*aria-hidden="true"[^>]*class="([^"]*)"/)?.[1] ?? "";
    expect(layer).toContain("-z-10");
    expect(layer).toContain("pointer-events-none");
  });
});
