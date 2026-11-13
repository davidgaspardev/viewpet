import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PrivacyPage, { metadata as privacyMetadata } from "@/app/privacy/page";
import TermsPage, { metadata as termsMetadata } from "@/app/terms/page";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/utils/routes";

import { LegalDocumentView, formatVersionDate } from "../components/LegalDocumentView";
import { LegalLinks } from "../components/LegalLinks";
import type { LegalContact } from "../config";
import { privacyDocument } from "../privacy";
import { termsDocument } from "../terms";
import { PRIVACY_VERSION, TERMS_VERSION } from "../versions";

const CONTACT: LegalContact = {
  entityName: "ViewPet Ltda",
  document: "CNPJ 00.000.000/0001-00",
  email: "privacidade@example.com",
};

/** The markup renders `'` as `&#x27;` and so on; compare against the text the user reads. */
const decode = (html: string) =>
  html.replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&");

const fullText = (doc: ReturnType<typeof privacyDocument>) =>
  doc.sections
    .flatMap((s) => [s.title, ...(s.paragraphs ?? []), ...(s.items ?? []), ...(s.closing ?? [])])
    .join("\n");

describe.each([
  ["terms", termsDocument, TERMS_PATH, TERMS_VERSION],
  ["privacy policy", privacyDocument, PRIVACY_PATH, PRIVACY_VERSION],
] as const)("the %s", (_name, build, path, version) => {
  const doc = build(CONTACT);

  test("has its path, its version and an intro", () => {
    expect(doc.path).toBe(path);
    expect(doc.version).toBe(version);
    expect(doc.intro.trim()).not.toBe("");
  });

  test("every section has a unique anchor, a title and some text", () => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of doc.sections) {
      expect(section.id).toMatch(/^[a-z-]+$/);
      expect(section.title.trim()).not.toBe("");
      const text = [...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.closing ?? [])];
      expect(text.length).toBeGreaterThan(0);
      for (const line of text) expect(line.trim()).not.toBe("");
    }
  });

  test("renders as a page with an index that links to every section", () => {
    const html = decode(renderToStaticMarkup(<LegalDocumentView doc={doc} contact={CONTACT} />));
    expect(html).toContain(`<h1`);
    expect(html).toContain(doc.title);
    expect(html).toContain(formatVersionDate(version));
    for (const section of doc.sections) {
      expect(html).toContain(`href="#${section.id}"`);
      expect(html).toContain(`id="${section.id}"`);
    }
  });
});

describe("the privacy policy", () => {
  const text = fullText(privacyDocument(CONTACT));

  test("names the controller and how to reach it (LGPD art. 9, III)", () => {
    expect(text).toContain("ViewPet Ltda (CNPJ 00.000.000/0001-00)");
    expect(text).toContain("privacidade@example.com");
  });

  test("names the encarregado only when there is one (art. 41)", () => {
    expect(text).not.toContain("Encarregado");
    const withOfficer = fullText(privacyDocument({ ...CONTACT, officerName: "Maria Silva" }));
    expect(withOfficer).toContain("Encarregado pelo tratamento de dados pessoais (art. 41 da LGPD): Maria Silva");
  });

  test("tells every item art. 9 asks for: purpose, legal basis, sharing, rights, retention", () => {
    for (const needle of [
      "Para que usamos",
      "base legal",
      "Com quem compartilhamos",
      "Seus direitos",
      "Por quanto tempo guardamos",
      "Transferência para fora do Brasil",
      "Revogar o consentimento",
    ]) {
      expect(text).toContain(needle);
    }
  });

  test("lists all nine rights of art. 18", () => {
    const rights = privacyDocument(CONTACT).sections.find((s) => s.id === "direitos")?.items;
    expect(rights).toHaveLength(9);
  });

  test("says what the form collects and what the pet page shows", () => {
    for (const needle of ["celular", "WhatsApp", "Telegram", "e-mail", "foto", "alergias"]) {
      expect(text.toLowerCase()).toContain(needle.toLowerCase());
    }
    expect(text).toContain("aparecem parcialmente ocultos");
    expect(text).toContain("número completo");
    expect(text).toContain("qr_scan");
  });

  test("without the controller's details it falls back to a neutral name and no e-mail", () => {
    const bare = fullText(privacyDocument({}));
    expect(bare).toContain("é o ViewPet.");
    expect(bare).not.toContain("@");
  });
});

describe("the pages", () => {
  test("are titled and indexable", () => {
    expect(termsMetadata.title).toContain("Termos de Uso");
    expect(privacyMetadata.title).toContain("Política de Privacidade");
    expect(termsMetadata.robots).toBeUndefined();
    expect(privacyMetadata.robots).toBeUndefined();
  });

  test("render with the document and a link to the other one", () => {
    const terms = renderToStaticMarkup(<TermsPage />);
    expect(terms).toContain("Termos de Uso");
    expect(terms).toContain(`href="${PRIVACY_PATH}"`);
    const privacy = renderToStaticMarkup(<PrivacyPage />);
    expect(privacy).toContain("Política de Privacidade");
    expect(privacy).toContain(`href="${TERMS_PATH}"`);
  });

  test("outside production, a missing controller is flagged on the page", () => {
    const html = renderToStaticMarkup(<LegalDocumentView doc={termsDocument({})} contact={{}} />);
    expect(html).toContain("Dados do controlador ainda não configurados");
    expect(html).toContain("PRIVACY_CONTACT_EMAIL");
    expect(renderToStaticMarkup(<LegalDocumentView doc={termsDocument(CONTACT)} contact={CONTACT} />)).not.toContain(
      "ainda não configurados",
    );
  });

  test("show the contact as a mailto link when there is an e-mail", () => {
    const html = renderToStaticMarkup(<LegalDocumentView doc={privacyDocument(CONTACT)} contact={CONTACT} />);
    expect(html).toContain('href="mailto:privacidade@example.com"');
  });
});

describe("LegalLinks", () => {
  test("link both documents, in the language of the page", () => {
    const pt = renderToStaticMarkup(<LegalLinks locale="pt-BR" />);
    expect(pt).toContain(`href="${TERMS_PATH}"`);
    expect(pt).toContain(`href="${PRIVACY_PATH}"`);
    expect(pt).toContain("Termos de Uso");
    const en = renderToStaticMarkup(<LegalLinks locale="en-US" />);
    expect(en).toContain("Privacy Policy");
    expect(en).toContain(`href="${PRIVACY_PATH}"`);
  });
});

test("the legal paths cannot be taken for a tag id by the QR middleware", () => {
  for (const path of [TERMS_PATH, PRIVACY_PATH]) {
    expect(/^\/[A-Za-z0-9]{12}$/.test(path)).toBe(false);
  }
});
