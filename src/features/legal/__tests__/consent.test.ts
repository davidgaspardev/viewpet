import { describe, expect, test } from "bun:test";

import { CONSENT_PUBLIC_FIELD, CONSENT_TERMS_FIELD, parseConsent } from "../consent";
import { legalContact, loadLegalContact, missingContactVariables } from "../config";
import { PRIVACY_VERSION, TERMS_VERSION } from "../versions";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe("parseConsent", () => {
  const NOW = new Date("2026-11-13T15:30:00.000Z");

  test("both boxes ticked: records when, and which version of each document", () => {
    const consent = parseConsent(form({ [CONSENT_TERMS_FIELD]: "on", [CONSENT_PUBLIC_FIELD]: "on" }), NOW);
    expect(consent).toEqual({
      acceptedAt: "2026-11-13T15:30:00.000Z",
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    });
  });

  test("records nothing else about the person", () => {
    const consent = parseConsent(form({ [CONSENT_TERMS_FIELD]: "on", [CONSENT_PUBLIC_FIELD]: "on" }), NOW);
    expect(Object.keys(consent ?? {}).sort()).toEqual(["acceptedAt", "privacyVersion", "termsVersion"]);
  });

  test("is null when either box is missing, empty or not exactly `on`", () => {
    expect(parseConsent(form({}), NOW)).toBeNull();
    expect(parseConsent(form({ [CONSENT_TERMS_FIELD]: "on" }), NOW)).toBeNull();
    expect(parseConsent(form({ [CONSENT_PUBLIC_FIELD]: "on" }), NOW)).toBeNull();
    expect(parseConsent(form({ [CONSENT_TERMS_FIELD]: "on", [CONSENT_PUBLIC_FIELD]: "" }), NOW)).toBeNull();
    expect(parseConsent(form({ [CONSENT_TERMS_FIELD]: "true", [CONSENT_PUBLIC_FIELD]: "on" }), NOW)).toBeNull();
  });

  test("the document versions are dates, so they sort and read as such", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PRIVACY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("legalContact", () => {
  test("reads the controller's details, trimmed", () => {
    expect(
      legalContact({
        LEGAL_ENTITY_NAME: "  ViewPet Ltda ",
        LEGAL_ENTITY_DOCUMENT: "CNPJ 00.000.000/0001-00",
        PRIVACY_CONTACT_EMAIL: " privacidade@example.com ",
        PRIVACY_OFFICER_NAME: "Maria Silva",
      }),
    ).toEqual({
      entityName: "ViewPet Ltda",
      document: "CNPJ 00.000.000/0001-00",
      email: "privacidade@example.com",
      officerName: "Maria Silva",
    });
  });

  test("blank values and an invalid e-mail count as not set", () => {
    const contact = legalContact({ LEGAL_ENTITY_NAME: "  ", PRIVACY_CONTACT_EMAIL: "not an email" });
    expect(contact).toEqual({
      entityName: undefined,
      document: undefined,
      email: undefined,
      officerName: undefined,
    });
    expect(missingContactVariables(contact)).toEqual([
      "LEGAL_ENTITY_NAME",
      "LEGAL_ENTITY_DOCUMENT",
      "PRIVACY_CONTACT_EMAIL",
    ]);
  });

  test("the encarregado is optional", () => {
    const contact = legalContact({
      LEGAL_ENTITY_NAME: "ViewPet Ltda",
      LEGAL_ENTITY_DOCUMENT: "CNPJ 00.000.000/0001-00",
      PRIVACY_CONTACT_EMAIL: "privacidade@example.com",
    });
    expect(missingContactVariables(contact)).toEqual([]);
  });

  test("in production, missing details are logged", () => {
    const warnings: unknown[][] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => void warnings.push(args);
    try {
      loadLegalContact({ NODE_ENV: "production" });
      loadLegalContact({ NODE_ENV: "development" });
    } finally {
      console.warn = original;
    }
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0]?.[0])).toContain("PRIVACY_CONTACT_EMAIL");
  });
});
