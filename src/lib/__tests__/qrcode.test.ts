import { describe, expect, test } from "bun:test";
import { renderQrSvg } from "../qrcode/render";

describe("renderQrSvg", () => {
  const url = "https://viewpet.example/view/abcd2345efgh";

  test("renders circle dots and no square modules", () => {
    const svg = renderQrSvg(url);
    expect(svg).toStartWith("<svg");
    expect(svg).toContain("<circle");
    expect(svg).not.toContain("<path");
  });

  test("is deterministic for the same input", () => {
    expect(renderQrSvg(url)).toBe(renderQrSvg(url));
  });

  test("embeds the logo and clears dots under it only when a logo is given", () => {
    const plain = renderQrSvg(url);
    const withLogo = renderQrSvg(url, { logoHref: "data:image/svg+xml;base64,AAAA" });
    expect(plain).not.toContain("<image");
    expect(withLogo).toContain('<image href="data:image/svg+xml;base64,AAAA"');
    // Dots under the logo are dropped, so the logo variant has fewer data dots
    // despite the extra backing disc.
    const dots = (svg: string) => svg.match(/<circle cx="[\d.]+" cy="[\d.]+" r="0\.42"\/>/g)!.length;
    expect(dots(withLogo)).toBeLessThan(dots(plain));
  });
});

describe("renderQrSvg escaping", () => {
  test("escapes attribute values", () => {
    const svg = renderQrSvg("x", { logoHref: 'a"><script>', color: '"red', background: "<b" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&quot;");
  });
});
