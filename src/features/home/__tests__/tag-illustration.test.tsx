import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { TagIllustration } from "../components/TagIllustration";
import { HOME_QR_ID } from "../qr";

describe("TagIllustration", () => {
  const html = renderToStaticMarkup(<TagIllustration tagId="7h3m9xk2q4wp" />);

  test("has the QR code, drawn from the page's symbol, and the id under it", () => {
    expect(html).toContain(`href="#${HOME_QR_ID}"`);
    expect(html.indexOf(`href="#${HOME_QR_ID}"`)).toBeLessThan(html.indexOf(">7h3m9xk2q4wp</span>"));
  });

  test("says what it is for assistive technology, once, with the id", () => {
    expect(html).toContain(
      'role="img" aria-label="Plaquinha de aço escovado com um QR Code e, abaixo dele, o código 7h3m9xk2q4wp"',
    );
  });

  test("is on a brushed-steel surface, with no image file", () => {
    expect(html).toContain("conic-gradient");
    expect(html).toContain("<feTurbulence");
    expect(html).not.toMatch(/<img|\.png|\.svg"|data:image|noise/);
  });

  test("the steel is not positioned by its own class: a position class on it would lose to its own `relative`", () => {
    const surface = html.match(/<div class="([^"]*)" style="[^"]*conic-gradient/)?.[1] ?? "";
    expect(surface).toContain("relative");
    expect(surface).not.toMatch(/\b(absolute|fixed|sticky)\b/);
  });

  test("has a hole for the cord, cut out of the steel and above the QR Code", () => {
    const surface = html.match(/<div class="([^"]*)" style="[^"]*conic-gradient/)?.[1] ?? "";
    // Cut with a mask, so what is behind the tag shows through: not a circle painted on it.
    expect(surface).toContain("[mask-image:radial-gradient(");
    expect(surface).toContain("transparent_");
    const holeY = Number(html.match(/\[--hole-y:(\d+(?:\.\d+)?)%\]/)?.[1]);
    const qrTop = Number(html.match(/\btop-\[(\d+(?:\.\d+)?)%\] aspect-square/)?.[1]);
    const qrWidth = Number(html.match(/\baspect-square w-\[(\d+(?:\.\d+)?)%\]/)?.[1]);
    const holeR = Number(html.match(/\[--hole-r:(\d+(?:\.\d+)?)%\]/)?.[1]);
    expect(holeR).toBeGreaterThan(0);
    // The symbol has a blank margin of about a ninth of its width; the hole may reach into it but not into the dots.
    expect(holeY + holeR).toBeLessThanOrEqual(qrTop + qrWidth / 9);
    // And the hole is above the middle of the tag, where the QR Code is.
    expect(holeY).toBeLessThan(25);
  });

  test("the shadow follows the cut: a drop-shadow on the root, none on the masked steel", () => {
    const surface = html.match(/<div class="([^"]*)" style="[^"]*conic-gradient/)?.[1] ?? "";
    expect(html).toContain("drop-shadow(");
    expect(surface).not.toMatch(/(^|\s)(shadow|ring)-/);
  });

  test("hangs from the hole when it swings", () => {
    expect(html).toContain("origin-[50%_var(--hole-y)]");
  });

  test("shows no pet name: the tag is the same for every pet", () => {
    expect(html).not.toMatch(/Thor|Lupe|Escaneie e ligue/);
  });

  test("swings only when asked", () => {
    expect(html).not.toContain("animate-sway");
    expect(renderToStaticMarkup(<TagIllustration tagId="7h3m9xk2q4wp" swing />)).toContain("motion-safe:animate-sway");
  });
});
