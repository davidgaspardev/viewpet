import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { formatAge } from "@/lib/utils/age";

import { PetDetails } from "../components/PetDetails";

const render = (pet: Parameters<typeof PetDetails>[0]["pet"]) =>
  renderToStaticMarkup(<PetDetails pet={pet} locale="pt-BR" />);

describe("PetDetails", () => {
  test("renders nothing when the pet has no details", () => {
    expect(render({ name: "Thor" })).toBe("");
  });

  test("the header grows with a long name instead of overflowing a fixed height", () => {
    const html = render({ name: "Princesa Isabel Cristina de Bragança", breed: "SRD" });
    expect(html).toContain("min-h-16");
    expect(html).not.toMatch(/[\s"]h-16[\s"]/);
  });

  test("an allergy repeated in stored data is listed as many times as stored", () => {
    // Stored data isn't deduped (only the registration form is): both chips render, under distinct keys.
    const html = render({ name: "Thor", allergies: ["Frango", "Frango", "Pólen"] });
    expect(html.split("Frango").length - 1).toBe(2);
    expect(html).toContain("Pólen");
  });

  test("shows type, breed, weight and neutered as tiles, in the reader's language", () => {
    const pet = { name: "Luna", species: "cat", breed: "Siamês", weightKg: 4.5, neutered: true } as const;
    const pt = renderToStaticMarkup(<PetDetails pet={pet} locale="pt-BR" />);
    for (const text of ["Tipo", "Gato", "Raça", "Siamês", "Peso", "4,5 kg", "Castrado(a)", "Sim"]) {
      expect(pt).toContain(text);
    }
    const en = renderToStaticMarkup(<PetDetails pet={pet} locale="en-US" />);
    for (const text of ["Type", "Cat", "Weight", "4.5 kg", "Neutered", "Yes"]) {
      expect(en).toContain(text);
    }
  });

  test("a pet that is not neutered says No; one never asked says nothing", () => {
    expect(render({ name: "Thor", neutered: false })).toContain("Não");
    const unknown = render({ name: "Thor", species: "dog" });
    expect(unknown).toContain("Cachorro");
    expect(unknown).not.toContain("Castrado");
  });

  test("a legacy pet with only a breed still renders, its lone tile on the full row", () => {
    const html = render({ name: "Thor", breed: "SRD" });
    expect(html).toContain("SRD");
    expect(html).toContain("last:odd:col-span-2");
    expect(html).not.toContain("Tipo");
  });

  test("a species this build does not know about is not rendered as a blank tile", () => {
    // The repository drops unknown kinds, but the component must not draw an empty tile if one slips through.
    const html = render({ name: "Thor", species: "dragon" as never, breed: "SRD" });
    expect(html).toContain("SRD");
    expect(html).not.toContain("Tipo");
  });

  describe("age tile", () => {
    const birthdate = "2018-04-10T00:00:00.000Z";

    test("comes first, on a row of its own, with the month and year of birth", () => {
      const html = render({ name: "Lupe", birthdate, species: "dog", breed: "SRD" });
      expect(html).toContain("Idade");
      expect(html).toContain(formatAge(birthdate, "pt-BR"));
      expect(html).toContain("nasceu em abr. de 2018");
      // Before the type and breed tiles; the other tiles are a grid after it, not beside it.
      expect(html.indexOf("Idade")).toBeLessThan(html.indexOf("Tipo"));
      expect(html.indexOf("nasceu em")).toBeLessThan(html.indexOf("grid-cols-2"));
    });

    test("is translated", () => {
      const html = renderToStaticMarkup(
        <PetDetails pet={{ name: "Lupe", birthdate }} locale="en-US" />,
      );
      expect(html).toContain("Age");
      expect(html).toContain(formatAge(birthdate, "en-US"));
      expect(html).toContain("born Apr 2018");
    });

    test("alone is enough to show the block; the other tiles keep their own rule", () => {
      const only = render({ name: "Lupe", birthdate });
      expect(only).toContain("Sobre Lupe");
      expect(only).not.toContain("grid-cols-2");
      // With one other fact, that tile still takes its full row.
      expect(render({ name: "Lupe", birthdate, breed: "SRD" })).toContain("last:odd:col-span-2");
    });

    test("no birthdate, or one that isn't a date, means no age tile (and no 'Invalid Date')", () => {
      expect(render({ name: "Lupe", breed: "SRD" })).not.toContain("Idade");
      const bad = render({ name: "Lupe", breed: "SRD", birthdate: "not a date" });
      expect(bad).not.toContain("Idade");
      expect(bad).not.toContain("Invalid");
      expect(bad).not.toContain("NaN");
    });
  });
});
