import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import QRCode from "qrcode";
import { LOGO_DATA_URI } from "../qrcode/logo";
import { renderQrSvg } from "../qrcode/render";

const MARGIN = 4;
const url = "https://viewpet.example/view/abcd2345efgh";

/** (row,col) of every data dot (r="0.42") in the rendered SVG. */
function dotCells(svg: string): Set<string> {
  const cells = new Set<string>();
  for (const m of svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="0\.42"\/>/g)) {
    cells.add(`${Math.floor(Number(m[2])) - MARGIN},${Math.floor(Number(m[1])) - MARGIN}`);
  }
  return cells;
}

describe("renderQrSvg", () => {
  test("renders circle dots and no square modules", () => {
    const svg = renderQrSvg(url);
    expect(svg).toStartWith("<svg");
    expect(svg).toContain("<circle");
    expect(svg).not.toContain("<path");
  });

  test("is deterministic for the same input", () => {
    expect(renderQrSvg(url)).toBe(renderQrSvg(url));
  });

  test("draws exactly the library's dark data modules (finders excluded)", () => {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: "H" });
    const n = modules.size;
    const expected = new Set<string>();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const finder = (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
        if (modules.get(r, c) && !finder) expected.add(`${r},${c}`);
      }
    }
    expect(dotCells(renderQrSvg(url))).toEqual(expected);
  });

  test("draws three concentric-ring finder patterns", () => {
    const svg = renderQrSvg(url);
    expect(svg.match(/r="3\.5"/g)).toHaveLength(3);
    expect(svg.match(/r="2\.5"/g)).toHaveLength(3);
    expect(svg.match(/r="1\.5"/g)).toHaveLength(3);
  });

  test("embeds the logo and clears only the dots under it", () => {
    const logoHref = "data:image/svg+xml;base64,AAAA";
    const plain = renderQrSvg(url);
    const withLogo = renderQrSvg(url, { logoHref });
    expect(plain).not.toContain("<image");
    expect(withLogo).toContain(`<image xlink:href="${logoHref}"`);
    expect(withLogo).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');

    const before = dotCells(plain);
    const after = dotCells(withLogo);
    const removed = [...before].filter((cell) => !after.has(cell));
    expect(removed.length).toBeGreaterThan(0);
    expect([...after].every((cell) => before.has(cell))).toBe(true);

    // Every removed dot sits inside the logo's clear zone around the centre.
    const n = (Number(/viewBox="0 0 (\d+)/.exec(withLogo)![1]) - MARGIN * 2);
    const centre = (n - 1) / 2;
    const clearRadius = n * 0.11 + 0.5;
    for (const cell of removed) {
      const [r, c] = cell.split(",").map(Number);
      expect(Math.hypot(r - centre, c - centre)).toBeLessThan(clearRadius + 1e-9);
    }
  });
});

describe("renderQrSvg label", () => {
  test("adds the label as text in an extra band below the quiet zone", () => {
    const plain = renderQrSvg(url);
    const labelled = renderQrSvg(url, { label: "ay7vkdat8gdf" });
    expect(plain).not.toContain("<text");
    expect(labelled).toContain(">ay7vkdat8gdf</text>");

    const [, size, height] = /viewBox="0 0 (\d+) (\d+)"/.exec(labelled)!.map(Number);
    expect(height).toBeGreaterThan(size);
    // The text sits below the code's quiet zone, inside the extended canvas.
    const y = Number(/<text x="[\d.]+" y="([\d.]+)"/.exec(labelled)![1]);
    expect(y).toBeGreaterThan(size);
    expect(y).toBeLessThan(height);
    // The code itself is unchanged by the label.
    expect(dotCells(labelled)).toEqual(dotCells(plain));
  });

  test("squeezes a label that is too wide instead of letting it clip", () => {
    const [, width] = /viewBox="0 0 (\d+) /.exec(renderQrSvg(url, { label: "x" }))!.map(Number);
    const long = renderQrSvg(url, { label: "a".repeat(30) });
    const fitted = Number(/textLength="([\d.]+)"/.exec(long)![1]);
    expect(fitted).toBeLessThan(width);
    expect(renderQrSvg(url, { label: "ay7vkdat8gdf" })).not.toContain("textLength");
  });

  test("names the image after its label", () => {
    expect(renderQrSvg(url, { label: "ay7vkdat8gdf" })).toContain('aria-label="QR code ay7vkdat8gdf"');
    expect(renderQrSvg(url)).toContain('aria-label="QR code"');
  });

  test("escapes the label text", () => {
    expect(renderQrSvg(url, { label: "<b>&" })).toContain("&lt;b&gt;&amp;");
  });
});

describe("renderQrSvg escaping", () => {
  test("escapes attribute values", () => {
    const svg = renderQrSvg("x", { logoHref: 'a"><script>', color: '"red', background: "<b" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&quot;");
  });
});

describe("LOGO_DATA_URI", () => {
  test("is in sync with public/logo.svg (run `bun run qr-logo` if this fails)", () => {
    const source = readFileSync(join(import.meta.dir, "../../../public/logo.svg"), "utf8");
    const linePath = /<path d="([^"]+)"/.exec(source)![1];
    const logo = Buffer.from(LOGO_DATA_URI.split(",")[1], "base64").toString("utf8");
    expect(logo).toContain(`d="${linePath}"`);
    // Line art only: an opaque background path would paint over neighbouring dots.
    expect(logo.match(/<path/g)).toHaveLength(1);
  });
});
