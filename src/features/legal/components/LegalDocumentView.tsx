import Link from "next/link";

import { PRIVACY_PATH, TERMS_PATH } from "@/lib/utils/routes";
import { Logo } from "@/ui/Logo";

import { missingContactVariables, type LegalContact } from "../config";
import type { LegalDocument } from "../types";

const OTHER_DOCUMENT = {
  [TERMS_PATH]: { href: PRIVACY_PATH, label: "Política de Privacidade" },
  [PRIVACY_PATH]: { href: TERMS_PATH, label: "Termos de Uso" },
} as const;

/** `2026-11-13` → `13/11/2026`. */
export function formatVersionDate(version: string): string {
  const [year, month, day] = version.split("-");
  return `${day}/${month}/${year}`;
}

/** A legal document as a page: title, version, table of contents, numbered sections and the contact. */
export function LegalDocumentView({ doc, contact }: { doc: LegalDocument; contact: LegalContact }) {
  const missing = missingContactVariables(contact);
  const other = OTHER_DOCUMENT[doc.path as keyof typeof OTHER_DOCUMENT];

  return (
    <>
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span aria-hidden="true">
              <Logo className="h-9 w-9 text-ink" />
            </span>
            <span className="text-lg font-bold tracking-tight text-ink">ViewPet</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        {/* Only outside production: in production the build logs the warning instead. */}
        {missing.length > 0 && process.env.NODE_ENV !== "production" && (
          <div
            role="note"
            className="mb-8 rounded-card border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Dados do controlador ainda não configurados. Defina {missing.join(", ")} antes de publicar este
            documento.
          </div>
        )}

        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm font-medium text-ink/70">
          Versão de {formatVersionDate(doc.version)}
        </p>
        <p className="mt-6 text-base leading-relaxed text-ink/80">{doc.intro}</p>

        <nav aria-label="Índice" className="mt-8 rounded-card bg-surface px-5 py-4">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink/80">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="underline-offset-2 hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="text-xl font-bold tracking-tight text-ink">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-ink/80">
                {section.paragraphs?.map((text) => <p key={text}>{text}</p>)}
                {section.items && (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.items.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                )}
                {section.closing?.map((text) => <p key={text}>{text}</p>)}
              </div>
            </section>
          ))}
        </div>

        {contact.email && (
          <section aria-labelledby="contato-title" className="mt-10 rounded-card bg-surface px-5 py-4">
            <h2 id="contato-title" className="text-lg font-bold tracking-tight text-ink">
              Contato
            </h2>
            <p className="mt-2 text-base text-ink/80">
              Dúvidas, pedidos sobre os seus dados ou remoção da página:{" "}
              <a href={`mailto:${contact.email}`} className="font-semibold text-ink underline">
                {contact.email}
              </a>
              .
            </p>
          </section>
        )}

        <nav aria-label="Outros documentos" className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          <Link href={other.href} className="text-ink underline-offset-2 hover:underline">
            {other.label}
          </Link>
          <Link href="/" className="text-ink underline-offset-2 hover:underline">
            Voltar ao início
          </Link>
        </nav>
      </main>
    </>
  );
}
