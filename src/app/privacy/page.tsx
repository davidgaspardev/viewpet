import type { Metadata } from "next";

import { LegalDocumentView } from "@/features/legal/components/LegalDocumentView";
import { loadLegalContact } from "@/features/legal/config";
import { privacyDocument } from "@/features/legal/privacy";

// Built once and regenerated at most hourly, so the controller's details follow the environment.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Política de Privacidade · ViewPet",
  description:
    "Quais dados o ViewPet trata, para quê, com quem os compartilha e como exercer seus direitos pela LGPD.",
};

export default function PrivacyPage() {
  const contact = loadLegalContact();
  return <LegalDocumentView doc={privacyDocument(contact)} contact={contact} />;
}
