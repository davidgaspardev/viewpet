import { describe, expect, test } from "bun:test";
import type { Pet, PetEntry } from "@/types/pet";
import { OG_IMAGE_QUALITY, OG_IMAGE_WIDTH, ogImagePath, petMetadata } from "../metadata";

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
    for (const entry of [{ status: "missing" } as PetEntry, { status: "reserved" } as PetEntry]) {
      const m = petMetadata(entry, "pt-BR");
      expect(m.title).toBe("View Pet");
      expect(m.description).toBeUndefined();
      expect(m.twitter).toBeUndefined();
      expect(m.openGraph).toEqual({ type: "website", siteName: "View Pet", locale: "pt_BR", title: "View Pet" });
    }
  });

  test("nothing about the guardian leaks into the tags", () => {
    const dump = JSON.stringify(petMetadata(filled(), "pt-BR"));
    for (const secret of ["Ana Silva", "ana@example.com", "5548999999999"]) {
      expect(dump).not.toContain(secret);
    }
  });
});
