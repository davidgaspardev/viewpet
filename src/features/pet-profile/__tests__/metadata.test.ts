import { describe, expect, test } from "bun:test";
import type { Pet, PetEntry } from "@/types/pet";
import { metadataBaseFor, OG_IMAGE_QUALITY, OG_IMAGE_WIDTH, ogImagePath, petMetadata } from "../metadata";

const pet = (over: Partial<Pet> = {}): Pet => ({
  name: "Lupe",
  pictureUrl: "https://cdn.example.com/pets/lupe.jpg",
  birthdate: "2018-04-21T00:00:00.000Z",
  status: "active",
  guardians: [
    { name: "Ana Silva", email: "ana@example.com", phones: [{ e164: "5548999999999", channels: ["call"] }], social: {} },
  ],
  ...over,
});
const filled = (p: Pet = pet()): PetEntry => ({ status: p.status === "lost" ? "lost" : "active", pet: p } as PetEntry);

describe("ogImagePath", () => {
  test("sends https photos and site-relative paths through the image optimizer", () => {
    const url = "https://cdn.example.com/pets/lupe.jpg";
    expect(ogImagePath(url)).toBe(
      `/_next/image?url=${encodeURIComponent(url)}&w=${OG_IMAGE_WIDTH}&q=${OG_IMAGE_QUALITY}`,
    );
    expect(ogImagePath("/uploads/lupe.jpg")).toBe(
      `/_next/image?url=${encodeURIComponent("/uploads/lupe.jpg")}&w=${OG_IMAGE_WIDTH}&q=${OG_IMAGE_QUALITY}`,
    );
  });

  test("leaves anything the optimizer can't take unchanged", () => {
    expect(ogImagePath("http://localhost:4566/bucket/lupe.jpg")).toBe("http://localhost:4566/bucket/lupe.jpg");
    expect(ogImagePath("//evil.example.com/x.jpg")).toBe("//evil.example.com/x.jpg");
    expect(ogImagePath("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  test("a preview image stays small by construction", () => {
    expect(OG_IMAGE_WIDTH).toBeLessThanOrEqual(1200);
    expect(OG_IMAGE_WIDTH).toBeGreaterThanOrEqual(300);
  });
});

describe("petMetadata", () => {
  test("a filled tag gets title, description, Open Graph and a large Twitter card with the photo", () => {
    const m = petMetadata(filled(), "pt-BR");
    const image = ogImagePath("https://cdn.example.com/pets/lupe.jpg");
    expect(m.title).toBe("Lupe · View Pet");
    expect(m.description).toBe("Perfil de Lupe. Contate o tutor pelo link.");
    expect(m.openGraph).toMatchObject({
      type: "website",
      siteName: "View Pet",
      locale: "pt_BR",
      title: "Lupe · View Pet",
      description: "Perfil de Lupe. Contate o tutor pelo link.",
      images: [{ url: image, alt: "Lupe" }],
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Lupe · View Pet", images: [image] });
  });

  test("the copy and locale follow the language", () => {
    const m = petMetadata(filled(), "en-US");
    expect(m.description).toBe("Lupe's profile. Contact the guardian through the link.");
    expect(m.openGraph).toMatchObject({ locale: "en_US" });
  });

  test("a lost pet's page is previewed like any other tag", () => {
    expect(petMetadata(filled(pet({ status: "lost" })), "pt-BR").openGraph).toMatchObject({ title: "Lupe · View Pet" });
  });

  test("search engines stay out in every state", () => {
    for (const entry of [filled(), { status: "missing" } as PetEntry, { status: "reserved" } as PetEntry]) {
      expect(petMetadata(entry, "pt-BR").robots).toEqual({ index: false, follow: false });
    }
  });

  test("unknown and reserved tags get a generic preview with no pet data and no image", () => {
    const description = "Veja as informações do seu pet e do dono em uma página pública.";
    for (const entry of [{ status: "missing" } as PetEntry, { status: "reserved" } as PetEntry]) {
      const m = petMetadata(entry, "pt-BR");
      expect(m.title).toBe("View Pet");
      expect(m.description).toBe(description);
      expect(m.twitter).toEqual({ card: "summary", title: "View Pet", description });
      expect(m.openGraph).toEqual({ type: "website", siteName: "View Pet", locale: "pt_BR", title: "View Pet", description });
    }
  });

  test("the generic preview follows the language too (no Portuguese under en_US)", () => {
    const m = petMetadata({ status: "reserved" } as PetEntry, "en-US");
    expect(m.description).toBe("See your pet's and guardian's information on a public page.");
    expect(m.openGraph).toMatchObject({ locale: "en_US", description: m.description });
    expect(m.twitter).toMatchObject({ description: m.description });
  });

  test("a pet with no photo gets a plain summary card and no image tags", () => {
    const m = petMetadata(filled(pet({ pictureUrl: "" })), "pt-BR");
    expect(m.twitter).toEqual({
      card: "summary",
      title: "Lupe · View Pet",
      description: "Perfil de Lupe. Contate o tutor pelo link.",
    });
    expect(m.openGraph).not.toHaveProperty("images");
    expect(m.openGraph).toMatchObject({ title: "Lupe · View Pet" });
  });

  test("nothing about the guardian leaks into the tags", () => {
    const dump = JSON.stringify(petMetadata(filled(), "pt-BR"));
    for (const secret of ["Ana Silva", "ana@example.com", "5548999999999"]) {
      expect(dump).not.toContain(secret);
    }
  });
});

describe("metadataBaseFor", () => {
  const headers = (h: Record<string, string>) => ({ get: (name: string) => h[name.toLowerCase()] ?? null });

  test("SITE_URL wins", () => {
    expect(metadataBaseFor("https://viewpet.info", headers({ host: "other.example" }))?.href).toBe("https://viewpet.info/");
  });

  test("without SITE_URL it uses the request's own origin", () => {
    expect(metadataBaseFor(undefined, headers({ host: "viewpet.info", "x-forwarded-proto": "https" }))?.origin).toBe("https://viewpet.info");
    expect(metadataBaseFor("", headers({ host: "localhost:3000" }))?.origin).toBe("http://localhost:3000");
  });

  test("a set-but-invalid SITE_URL falls back to the request origin instead of Next's localhost default", () => {
    expect(metadataBaseFor("viewpet.info", headers({ host: "viewpet.info" }))?.origin).toBe("https://viewpet.info");
    expect(metadataBaseFor("ftp://viewpet.info", headers({ host: "viewpet.info" }))?.origin).toBe("https://viewpet.info");
  });

  test("never throws on hostile or malformed host headers", () => {
    for (const host of ["bad host", "a b", "evil.com/path", "user@evil.com", "", "[", "ex ample.com:80"]) {
      expect(() => metadataBaseFor(undefined, headers({ "x-forwarded-host": host, host }))).not.toThrow();
      expect(() => metadataBaseFor("oops", headers({ "x-forwarded-host": host }))).not.toThrow();
    }
    expect(metadataBaseFor(undefined, headers({ "x-forwarded-host": "bad host", host: "bad host" }))).toBeUndefined();
  });
});
