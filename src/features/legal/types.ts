export type LegalSection = {
  /** Anchor of the section. */
  id: string;
  title: string;
  /** Shown first. */
  paragraphs?: readonly string[];
  /** A bulleted list, after the paragraphs. */
  items?: readonly string[];
  /** Paragraphs after the list. */
  closing?: readonly string[];
};

export type LegalDocument = {
  /** Where the document lives (see `TERMS_PATH` / `PRIVACY_PATH`). */
  path: string;
  title: string;
  /** `YYYY-MM-DD`, the date of its last change. */
  version: string;
  intro: string;
  sections: readonly LegalSection[];
};
