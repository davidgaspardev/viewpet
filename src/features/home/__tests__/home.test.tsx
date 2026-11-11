import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage, { metadata } from "@/app/page";
import { GET as getHomeQr } from "@/app/home-qr.svg/route";
import { OG_LOCALE, SITE_NAME } from "@/features/pet-profile/metadata";
import { maskPhoneDisplay } from "@/lib/utils/phone";
import { MAX_GUARDIANS } from "@/types/pet";

import { FinalCta } from "../components/FinalCta";
import { HomeHeader } from "../components/HomeHeader";
import { PET_PAGE, NAV_LINKS, PAGE_META, SECTION_IDS } from "../content";
import { demoTagHref } from "../demo";
import { HOME_QR_PATH, homeQrTarget } from "../qr";

const DEMO_ID = "nuxw4d83wraa";
// Well formed, but no pet has it.
const UNKNOWN_ID = "38q9uymz5c43";
const originalDemoId = process.env.DEMO_TAG_ID;

afterEach(() => {
  if (originalDemoId === undefined) delete process.env.DEMO_TAG_ID;
  else process.env.DEMO_TAG_ID = originalDemoId;
});

const countOf = (html: string, needle: string) => html.split(needle).length - 1;

describe("demoTagHref", () => {
  test("links to the tag page of a published pet, ignoring surrounding spaces", async () => {
    expect(await demoTagHref(DEMO_ID)).toBe(`/tag/${DEMO_ID}`);
    expect(await demoTagHref(`  ${DEMO_ID}\n`)).toBe(`/tag/${DEMO_ID}`);
  });

  test("is undefined for nothing, blank, or something that is not a tag id", async () => {
    // An explicit `undefined` means "no id", whatever the environment holds.
    process.env.DEMO_TAG_ID = DEMO_ID;
    expect(await demoTagHref(undefined)).toBeUndefined();
    expect(await demoTagHref("")).toBeUndefined();
    expect(await demoTagHref("   ")).toBeUndefined();
    expect(await demoTagHref("../admin")).toBeUndefined();
    expect(await demoTagHref("short")).toBeUndefined();
  });

  test("is undefined for a well-formed id that no pet has", async () => {
    expect(await demoTagHref(UNKNOWN_ID)).toBeUndefined();
  });
});

describe("homeQrTarget", () => {
  test("is the site URL, normalised", () => {
    expect(homeQrTarget("https://example.com/")).toBe("https://example.com");
  });

  test("falls back to the production site for blank, whitespace or invalid values", () => {
    for (const value of [undefined, "", "   ", "viewpet.info", "ftp://example.com"]) {
      expect(homeQrTarget(value)).toBe("https://viewpet.info");
    }
  });
});

describe("home QR image", () => {
  test("is served as one SVG file", async () => {
    const res = getHomeQr();
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(await res.text()).toContain("<svg");
  });
});

describe("HomePage", () => {
  const render = async () => renderToStaticMarkup(await HomePage());

  test("is a marketing page about the product: headline, sections and footer", async () => {
    delete process.env.DEMO_TAG_ID;
    const html = await render();
    expect(html).toContain("<h1");
    expect(html).toContain("Seu pet se perdeu?");
    for (const id of Object.values(SECTION_IDS)) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("<footer");
  });

  test("every nav link points at a section that exists", async () => {
    const html = await render();
    expect(NAV_LINKS.length).toBeGreaterThan(0);
    for (const { href } of NAV_LINKS) {
      expect(html).toContain(`id="${href.slice(1)}"`);
    }
  });

  test("has no 3D scene on it", async () => {
    const html = await render();
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("Digite o nome abaixo e visualize em 3D");
  });

  test("shows the QR code of the tag illustration as a shared file, not inline", async () => {
    const html = await render();
    expect(countOf(html, `src="${HOME_QR_PATH}"`)).toBe(2);
    expect(html).not.toContain('aria-label="QR code"');
  });

  test("repeats the logo path once: the footer and the phone mock point at the header's", async () => {
    const html = await render();
    expect(countOf(html, 'id="home-logo-path"')).toBe(1);
    expect(countOf(html, 'href="#home-logo-path"')).toBe(2);
  });

  test("does not offer a lost-pet mode, which a tutor cannot turn on yet", async () => {
    const html = await render();
    expect(html).not.toContain("Modo pet perdido");
  });

  test("says what the form says: the limits and the public notice come from the same source", async () => {
    const html = await render();
    expect(html).toContain(`Até ${MAX_GUARDIANS} tutores`);
    expect(html).toContain("inclusive os contatos do tutor");
    expect(PET_PAGE.features.length % 3).toBe(0);
  });

  test("the phone mock masks the number the way the pet page does", async () => {
    const html = await render();
    expect(html).toContain(maskPhoneDisplay("(11) 98765-4321"));
    expect(html).toContain("Meu Tutor");
  });

  test("without DEMO_TAG_ID it links to no example page", async () => {
    delete process.env.DEMO_TAG_ID;
    const html = await render();
    expect(html).not.toContain('href="/tag/');
    expect(html).not.toContain("Ver uma página de exemplo");
    // The primary button falls back to the in-page "how it works" link.
    expect(html).toContain(`href="#${SECTION_IDS.howItWorks}"`);
  });

  test("with DEMO_TAG_ID the header, the hero and the closing band link to it", async () => {
    process.env.DEMO_TAG_ID = DEMO_ID;
    const html = await render();
    expect(countOf(html, `href="/tag/${DEMO_ID}"`)).toBe(3);
  });

  test("with a DEMO_TAG_ID no pet has, it links to no example page", async () => {
    process.env.DEMO_TAG_ID = UNKNOWN_ID;
    const html = await render();
    expect(html).not.toContain('href="/tag/');
  });

  test("scrolls smoothly only here: the marker is on this page's <main>", async () => {
    expect(await render()).toContain("<main data-smooth-scroll");
  });

  test("is indexable and has its own title and description", () => {
    expect(metadata.title).toBe(PAGE_META.title);
    expect(metadata.description).toBe(PAGE_META.description);
    expect(metadata.robots).toBeUndefined();
  });

  test("shares the site name and locale of the pet pages, and has a Twitter card", () => {
    expect(metadata.openGraph).toMatchObject({ siteName: SITE_NAME, locale: OG_LOCALE["pt-BR"] });
    expect(metadata.twitter).toMatchObject({ card: "summary", title: PAGE_META.title });
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
