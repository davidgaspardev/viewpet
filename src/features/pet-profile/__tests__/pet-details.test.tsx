import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

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
});
