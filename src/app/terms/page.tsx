import type { Metadata } from "next";

import { LegalDocumentView } from "@/features/legal/components/LegalDocumentView";
import { loadLegalContact } from "@/features/legal/config";
import { termsDocument } from "@/features/legal/terms";

// Built once and regenerated at most hourly, so the controller's details follow the environment.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Termos de Uso · ViewPet",
  description: "As regras de uso do ViewPet, da plaquinha com QR Code e da página pública do pet.",
};

export default function TermsPage() {
  const contact = loadLegalContact();
  return <LegalDocumentView doc={termsDocument(contact)} contact={contact} />;
}
