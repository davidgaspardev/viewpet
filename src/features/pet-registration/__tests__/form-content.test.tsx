import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { getDictionary, SUPPORTED_LOCALES } from "@/lib/i18n";
import { Card } from "@/ui/Card";

import { AllergiesField } from "../components/AllergiesField";
import { FormIntro } from "../components/FormIntro";
import { PetForm } from "../components/PetForm";
import { PhoneFields } from "../components/PhoneFields";
import { SuggestInput } from "../components/SuggestInput";

/** The markup renders `'` as `&#x27;` and so on; compare against the text the user reads. */
const decode = (html: string) =>
  html
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("FormIntro", () => {
  for (const locale of SUPPORTED_LOCALES) {
    test(`${locale}: says what the page is, how it works and what becomes public`, () => {
      const dict = getDictionary(locale);
      const html = decode(renderToStaticMarkup(<FormIntro hashId="38q9uymz5c43" locale={locale} />));

      expect(html).toContain("38q9uymz5c43");
      expect(html).toContain(dict.formTitle);
      expect(html).toContain(dict.formLead);
      for (const step of dict.formSteps) {
        expect(html).toContain(step.title);
        expect(html).toContain(step.body);
      }
      // The public-exposure warning is a landmark note, always visible.
      expect(html).toContain('role="note"');
      expect(html).toContain(dict.formPublicNotice);
      expect(html).toContain(dict.requiredLegend);
    });
  }

  test("the steps are folded on phones and open from sm up, from a single list", () => {
    const html = renderToStaticMarkup(<FormIntro hashId="38q9uymz5c43" locale="pt-BR" />);
    // A toggle that exists only on phones, collapsed to start with...
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*sm:hidden/);
    // ...controlling a list that is hidden on phones and shown from sm up.
    expect(html).toContain('class="hidden sm:block"');
    // The list is in the page once, not once per breakpoint.
    expect(html.split("<ol").length - 1).toBe(1);
  });
});

describe("form copy", () => {
  test("every step has a title and a body, three of them, in every language", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const { formSteps } = getDictionary(locale);
      expect(formSteps).toHaveLength(3);
      for (const step of formSteps) {
        expect(step.title.trim()).not.toBe("");
        expect(step.body.trim()).not.toBe("");
      }
    }
  });

  test("the explanatory copy is translated, not left in one language", () => {
    const pt = getDictionary("pt-BR");
    const en = getDictionary("en-US");
    const keys = [
      "formTitle",
      "formLead",
      "formStepsTitle",
      "formPublicNotice",
      "requiredLegend",
      "petSectionHint",
      "petDetailsHint",
      "guardianSectionHint",
      "petNameHint",
      "petBreedHint",
      "petPictureTip",
      "guardianNameHint",
      "guardianEmailHint",
      "petNamePlaceholder",
      "guardianNamePlaceholder",
      "guardianEmailPlaceholder",
      "phoneHint",
      "phoneChannelsLabel",
      "socialHint",
      "addGuardianHint",
      "submitNotice",
    ] as const;
    for (const key of keys) {
      expect(pt[key].trim()).not.toBe("");
      expect(en[key].trim()).not.toBe("");
      expect(pt[key]).not.toBe(en[key]);
    }
  });
});

describe("Card", () => {
  test("a numbered section with a description shows both", () => {
    const html = renderToStaticMarkup(
      <Card title="Seu pet" step={1} description="Aparece no topo.">
        x
      </Card>,
    );
    expect(html).toContain("Seu pet");
    expect(html).toContain("Aparece no topo.");
    // The number is decoration — the heading already carries the meaning.
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>1<\/span>/);
  });

  test("a plain card (as the admin list uses it) renders no badge and no description", () => {
    const html = renderToStaticMarkup(<Card title="Reservado">x</Card>);
    expect(html).toContain("Reservado");
    expect(html).not.toContain('aria-hidden="true"');
    expect(html).not.toContain("text-ink/70");
  });
});

describe("PhoneFields", () => {
  const dict = getDictionary("pt-BR");
  const render = (isPrimaryGuardian: boolean) =>
    renderToStaticMarkup(<PhoneFields prefix="g0_" isPrimaryGuardian={isPrimaryGuardian} dict={dict} />);

  test("names the first number the main one, explains it, and labels the channels", () => {
    const html = render(true);
    expect(html).toContain(dict.cellphoneMain);
    expect(html).toContain(dict.phoneHint);
    expect(html).toContain(dict.phoneChannelsLabel);
    expect(html).toContain(dict.addPhone);
  });

  test("call and WhatsApp start ticked, Telegram does not", () => {
    const html = render(true);
    const box = (channel: string) => html.match(new RegExp(`<input[^>]*name="g0_p0_${channel}"[^>]*>`))![0];
    expect(box("call")).toContain("checked");
    expect(box("whatsapp")).toContain("checked");
    expect(box("telegram")).not.toContain("checked");
  });

  test("the primary guardian's first number is required; a secondary guardian's is not", () => {
    const phone = (html: string) => html.match(/<input[^>]*name="g0_p0_phone"[^>]*>/)![0];
    expect(phone(render(true))).toContain("required");
    expect(phone(render(false))).not.toContain("required");
  });

  test("the number is described by its hint, for assistive tech", () => {
    const html = render(true);
    // React doesn't keep the props' order in the markup, so read the whole tag first.
    const input = html.match(/<input[^>]*name="g0_p0_phone"[^>]*>/)![0];
    const describedBy = input.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
  });
});

describe("AllergiesField", () => {
  test("starts with nothing to submit — text typed later rides along as a hidden value, not a chip", () => {
    const html = renderToStaticMarkup(<AllergiesField locale="pt-BR" />);
    expect(html).not.toContain('name="allergies"');
    // The visible input has no name of its own; what it holds is sent via the hidden field.
    const visible = html.match(/<input[^>]*role="combobox"[^>]*>/)![0];
    expect(visible).not.toContain("name=");
  });
});

describe("SuggestInput", () => {
  const props = { label: "Alergias", value: "", onValueChange: () => {}, suggestions: [] };
  const comboboxOf = (html: string) => html.match(/<input[^>]*role="combobox"[^>]*>/)![0];

  test("is editable by default", () => {
    expect(comboboxOf(renderToStaticMarkup(<SuggestInput {...props} />))).not.toContain("readOnly");
  });

  test("read-only keeps the input in the page — so focus isn't lost — but not editable", () => {
    expect(comboboxOf(renderToStaticMarkup(<SuggestInput {...props} readOnly />))).toContain(
      'readOnly=""',
    );
  });
});

describe("PetForm placeholders", () => {
  for (const locale of SUPPORTED_LOCALES) {
    test(`${locale}: every free-text field shows an example of what to type`, () => {
      const html = decode(renderToStaticMarkup(<PetForm hashId="38q9uymz5c43" locale={locale} />));
      const inputs = html.match(/<input\b[^>]*>/g) ?? [];

      // Text-like inputs only: radios, checkboxes, the file picker and hidden
      // values have nothing to type into.
      const typed = inputs.filter((tag) => {
        const type = tag.match(/\btype="([^"]+)"/)?.[1] ?? "text";
        return ["text", "email", "tel", "search"].includes(type);
      });
      // Name, breed, birthdate, allergies, guardian name + email + phone, 4 socials.
      expect(typed.length).toBeGreaterThanOrEqual(10);

      for (const tag of typed) {
        const placeholder = tag.match(/\bplaceholder="([^"]*)"/)?.[1] ?? "";
        expect({ tag, placeholder: placeholder.trim() }).not.toEqual({ tag, placeholder: "" });
      }
      // The about box is a textarea, not an input.
      expect(html).toMatch(/<textarea\b[^>]*\bplaceholder="[^"]+"/);
    });
  }

  test("the new examples are the ones from the dictionary", () => {
    const dict = getDictionary("en-US");
    const html = decode(renderToStaticMarkup(<PetForm hashId="38q9uymz5c43" locale="en-US" />));
    for (const text of [dict.petNamePlaceholder, dict.guardianNamePlaceholder, dict.guardianEmailPlaceholder]) {
      expect(html).toContain(`placeholder="${text}"`);
    }
  });
});
