import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage, { metadata } from "@/app/page";

import { FinalCta } from "../components/FinalCta";
import { HomeHeader } from "../components/HomeHeader";
import { NAV_LINKS, PAGE_META, SECTION_IDS } from "../content";
import { demoTagHref } from "../demo";

const DEMO_ID = "nuxw4d83wraa";
const originalDemoId = process.env.DEMO_TAG_ID;

afterEach(() => {
  if (originalDemoId === undefined) delete process.env.DEMO_TAG_ID;
  else process.env.DEMO_TAG_ID = originalDemoId;
});

const countOf = (html: string, needle: string) => html.split(needle).length - 1;

describe("demoTagHref", () => {
  test("links to the tag page of a valid id, ignoring surrounding spaces", () => {
    expect(demoTagHref(DEMO_ID)).toBe(`/tag/${DEMO_ID}`);
    expect(demoTagHref(`  ${DEMO_ID}\n`)).toBe(`/tag/${DEMO_ID}`);
  });

  test("is undefined for nothing, blank, or something that is not a tag id", () => {
    expect(demoTagHref(undefined)).toBeUndefined();
    expect(demoTagHref("")).toBeUndefined();
    expect(demoTagHref("   ")).toBeUndefined();
    expect(demoTagHref("../admin")).toBeUndefined();
    expect(demoTagHref("short")).toBeUndefined();
  });

  test("reads DEMO_TAG_ID by default", () => {
    process.env.DEMO_TAG_ID = DEMO_ID;
    expect(demoTagHref()).toBe(`/tag/${DEMO_ID}`);
    delete process.env.DEMO_TAG_ID;
    expect(demoTagHref()).toBeUndefined();
  });
});

describe("HomePage", () => {
  const render = () => renderToStaticMarkup(<HomePage />);

  test("is a marketing page about the product: headline, sections and footer", () => {
    delete process.env.DEMO_TAG_ID;
    const html = render();
    expect(html).toContain("<h1");
    expect(html).toContain("Seu pet se perdeu?");
    for (const id of Object.values(SECTION_IDS)) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("<footer");
  });

  test("every nav link points at a section that exists", () => {
    const html = render();
    expect(NAV_LINKS.length).toBeGreaterThan(0);
    for (const { href } of NAV_LINKS) {
      expect(html).toContain(`id="${href.slice(1)}"`);
    }
  });

  test("has no 3D scene on it", () => {
    const html = render();
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("Digite o nome abaixo e visualize em 3D");
  });

  test("shows the QR code of the tag illustration", () => {
    const html = render();
    expect(html).toContain('aria-label="QR code"');
  });

  test("without DEMO_TAG_ID it links to no example page", () => {
    delete process.env.DEMO_TAG_ID;
    const html = render();
    expect(html).not.toContain('href="/tag/');
    expect(html).not.toContain("Ver uma página de exemplo");
    // The primary button falls back to the in-page "how it works" link.
    expect(html).toContain(`href="#${SECTION_IDS.howItWorks}"`);
  });

  test("with DEMO_TAG_ID the header, the hero and the closing band link to it", () => {
    process.env.DEMO_TAG_ID = DEMO_ID;
    const html = render();
    expect(countOf(html, `href="/tag/${DEMO_ID}"`)).toBe(3);
  });

  test("is indexable and has its own title and description", () => {
    expect(metadata.title).toBe(PAGE_META.title);
    expect(metadata.description).toBe(PAGE_META.description);
    expect(metadata.robots).toBeUndefined();
  });
});

describe("HomeHeader and FinalCta", () => {
  test("the header has no example button without a link", () => {
    expect(renderToStaticMarkup(<HomeHeader />)).not.toContain("Ver exemplo");
    expect(renderToStaticMarkup(<HomeHeader demoHref="/tag/x" />)).toContain("Ver exemplo");
  });

  test("the closing band exists only to link to the example, so it is left out without one", () => {
    expect(renderToStaticMarkup(<FinalCta />)).toBe("");
    expect(renderToStaticMarkup(<FinalCta demoHref="/tag/x" />)).toContain('href="/tag/x"');
  });
});
