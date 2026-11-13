/**
 * Who answers for the data (LGPD art. 9, III, and art. 41). These are the
 * business's own details, so they come from the environment rather than from
 * the source; the legal pages show whatever is set.
 */
export type LegalContact = {
  /** `LEGAL_ENTITY_NAME` — company or person that controls the data. */
  entityName?: string;
  /** `LEGAL_ENTITY_DOCUMENT` — its CNPJ (or CPF). */
  document?: string;
  /** `PRIVACY_CONTACT_EMAIL` — where data subjects send their requests. */
  email?: string;
  /** `PRIVACY_OFFICER_NAME` — the encarregado, when one was appointed. */
  officerName?: string;
};

type Env = Record<string, string | undefined>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: string | undefined) => value?.trim() || undefined;

/** Reads the contact details; blank values and an invalid e-mail count as not set. */
export function legalContact(env: Env = process.env): LegalContact {
  const email = clean(env.PRIVACY_CONTACT_EMAIL);
  return {
    entityName: clean(env.LEGAL_ENTITY_NAME),
    document: clean(env.LEGAL_ENTITY_DOCUMENT),
    email: email && EMAIL.test(email) ? email : undefined,
    officerName: clean(env.PRIVACY_OFFICER_NAME),
  };
}

/** Variables the policy cannot do without (the officer is optional). */
export function missingContactVariables(contact: LegalContact): string[] {
  const missing: string[] = [];
  if (!contact.entityName) missing.push("LEGAL_ENTITY_NAME");
  if (!contact.document) missing.push("LEGAL_ENTITY_DOCUMENT");
  if (!contact.email) missing.push("PRIVACY_CONTACT_EMAIL");
  return missing;
}

/**
 * `legalContact`, plus a warning in the logs (the build's, for these static
 * pages) when something required is missing: a privacy policy that does not say
 * who the controller is and how to reach them does not meet art. 9.
 */
export function loadLegalContact(env: Env = process.env): LegalContact {
  const contact = legalContact(env);
  const missing = missingContactVariables(contact);
  if (missing.length > 0 && env.NODE_ENV === "production") {
    console.warn(`The privacy policy lacks the controller's details; set ${missing.join(", ")}.`);
  }
  return contact;
}
