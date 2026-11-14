import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { BrushedMetal } from "../BrushedMetal";

const countOf = (html: string, needle: string) => html.split(needle).length - 1;

describe("BrushedMetal", () => {
  test("holds what it is given and takes the shape its className gives it", () => {
    const html = renderToStaticMarkup(
      <BrushedMetal className="aspect-square rounded-full shadow-lg">
        <span>engraved</span>
      </BrushedMetal>,
    );
    expect(html).toContain("<span>engraved</span>");
    expect(html).toContain("aspect-square rounded-full shadow-lg");
  });

  test("is drawn with gradients and a filter: no image file, no url() but the filter's", () => {
    const html = renderToStaticMarkup(<BrushedMetal />);
    expect(html).toContain("conic-gradient");
    expect(html).toContain("repeating-linear-gradient");
    expect(html).toContain("<feTurbulence");
    expect(html).not.toMatch(/<img|\.png|\.jpe?g|\.webp|data:image/);
    const urls = html.match(/url\([^)]*\)/g) ?? [];
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/^url\(#brushed-/);
  });

  test("the grain is stretched along the brushing: slow across, fast down the page", () => {
    const html = renderToStaticMarkup(<BrushedMetal />);
    const [across, down] = (html.match(/baseFrequency="([^"]+)"/)?.[1] ?? "").split(" ").map(Number);
    expect(across).toBeLessThan(0.05);
    expect(down).toBeGreaterThan(0.5);
  });

  test("the filter points at its own rect, and two surfaces never share an id", () => {
    const html = renderToStaticMarkup(
      <>
        <BrushedMetal />
        <BrushedMetal />
      </>,
    );
    const ids = [...html.matchAll(/<filter id="([^"]+)"/g)].map((m) => m[1]!);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(id).toMatch(/^brushed-[a-zA-Z0-9_-]+$/);
      expect(countOf(html, `filter="url(#${id})"`)).toBe(1);
    }
  });

  test("its decorative layers are hidden from assistive technology", () => {
    const html = renderToStaticMarkup(<BrushedMetal />);
    expect(countOf(html, 'aria-hidden="true"')).toBe(2);
  });

  test("keeps the outer shadow free for the caller: the bevel is a layer of its own", () => {
    const html = renderToStaticMarkup(<BrushedMetal className="shadow-xl" />);
    expect(html).not.toMatch(/style="[^"]*box-shadow/);
    expect(html).toContain("rounded-[inherit]");
  });
});
