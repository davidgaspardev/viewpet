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

  test("the steel is placed by a wrapper: a position class on it would lose to its own `relative`", () => {
    const surface = html.match(/<div class="([^"]*)" style="[^"]*conic-gradient/)?.[1] ?? "";
    expect(surface).toContain("relative");
    expect(surface).not.toMatch(/\b(absolute|fixed|sticky)\b/);
  });

  test("shows no pet name: the tag is the same for every pet", () => {
    expect(html).not.toMatch(/Thor|Lupe|Escaneie e ligue/);
  });

  test("swings only when asked", () => {
    expect(html).not.toContain("animate-sway");
    expect(renderToStaticMarkup(<TagIllustration tagId="7h3m9xk2q4wp" swing />)).toContain("motion-safe:animate-sway");
  });
});
