import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { getDictionary, SUPPORTED_LOCALES } from "@/lib/i18n";

import { PetHero } from "../components/PetHero";

const hero = (props: { gender?: "male" | "female"; locale: (typeof SUPPORTED_LOCALES)[number] }) =>
  renderToStaticMarkup(
    <PetHero name="Thor" pictureUrl="/uploads/thor.jpg" ageLabel="3 years old" {...props} />,
  );

describe("PetHero gender", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const dict = getDictionary(locale);

    test(`${locale}: male shows an icon labelled "${dict.genderMale}", not a symbol character`, () => {
      const html = hero({ gender: "male", locale });
      expect(html).toContain(`<title>${dict.genderMale}</title>`);
      expect(html).toContain('d="M19 5l-5.4 5.4"'); // Tabler gender-male
      expect(html).not.toContain(dict.genderFemale);
      expect(html).not.toMatch(/[♂♀]/);
    });

    test(`${locale}: female shows an icon labelled "${dict.genderFemale}", not a symbol character`, () => {
      const html = hero({ gender: "female", locale });
      expect(html).toContain(`<title>${dict.genderFemale}</title>`);
      expect(html).toContain('d="M12 14v7"'); // Tabler gender-female
      expect(html).not.toContain(dict.genderMale);
      expect(html).not.toMatch(/[♂♀]/);
    });
  }

  test("no gender, no icon", () => {
    const html = hero({ locale: "en-US" });
    const dict = getDictionary("en-US");
    expect(html).not.toContain(`<title>${dict.genderMale}</title>`);
    expect(html).not.toContain(`<title>${dict.genderFemale}</title>`);
    expect(html).not.toContain('d="M19 5l-5.4 5.4"');
    expect(html).not.toContain('d="M12 14v7"');
    expect(html).toContain("Thor");
  });
});
