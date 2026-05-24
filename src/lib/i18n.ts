/**
 * Pure i18n module — no Next.js server-only deps so it can be imported
 * by Client Components. Locale resolution that needs request headers
 * lives in `i18n.server.ts`.
 */

export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt-BR";

/**
 * Legacy locale codes for backward compatibility.
 * Maps simplified codes (pt, en) to full locale codes (pt-BR, en-US).
 */
const LOCALE_ALIASES: Record<string, Locale> = {
  pt: "pt-BR",
  en: "en-US",
};

type Dictionary = {
  guardianContact: string;
  guardianOther: string;
  name: string;
  email: string;
  cellphone: string;
  social: string;
  close: string;
  actionCall: string;
  actionCallTooltip: string;
  actionEmail: string;
  actionWhatsApp: string;
  yearsOld: (n: number) => string;
  monthsOld: (n: number) => string;
  notFoundTitle: string;
  notFoundBody: string;
  backHome: string;
  landingTitle: string;
  landingBody: string;
  tryExamples: string;
  // Form (empty entry → cadastro)
  formTitle: string;
  formIntro: (id: string) => string;
  petSection: string;
  guardianSection: string;
  socialSectionOptional: string;
  petName: string;
  petPicture: string;
  petPictureDropzone: string;
  petPictureCamera: string;
  petPictureBrowseBtn: string;
  petPictureReplace: string;
  petPictureRemove: string;
  petPictureHint: string;
  petBirthdate: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmailOptional: string;
  socialPlaceholder: string;
  optional: string;
  submit: string;
  submitting: string;
  errorMissing: string;
  errorPicture: string;
  errorPictureType: string;
  errorPictureSize: string;
  errorBirthdate: string;
  // Landing status
  statusEmpty: string;
  statusFilled: string;
};

const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": {
    guardianContact: "Meu Tutor",
    guardianOther: "Outro tutor da família",
    name: "Nome",
    email: "E-mail",
    cellphone: "Celular",
    social: "Redes sociais",
    close: "Fechar",
    actionCall: "Ligar",
    actionCallTooltip: "Clique neste botão para ligar para o tutor",
    actionEmail: "Enviar e-mail",
    actionWhatsApp: "Abrir WhatsApp",
    yearsOld: (n) => (n === 1 ? "1 ano" : `${n} anos`),
    monthsOld: (n) => (n === 1 ? "1 mês" : `${n} meses`),
    notFoundTitle: "Pet não encontrado",
    notFoundBody:
      "Não encontramos nenhum pet com esse identificador. Verifique o link e tente novamente.",
    backHome: "Voltar ao início",
    landingTitle: "View Pet",
    landingBody:
      "Acesse /view/<hashId> para visualizar a página pública de um pet.",
    tryExamples: "Exemplos para testar:",
    formTitle: "Cadastrar pet",
    formIntro: (id) =>
      `Esta página (${id}) está reservada mas ainda não tem dados. Preencha os campos abaixo para publicar.`,
    petSection: "Sobre o pet",
    guardianSection: "Contato do tutor",
    socialSectionOptional: "Redes sociais (opcional)",
    petName: "Nome do pet",
    petPicture: "Foto do pet",
    petPictureDropzone: "Arraste uma foto aqui",
    petPictureCamera: "Tirar foto agora",
    petPictureBrowseBtn: "Escolher do dispositivo",
    petPictureReplace: "Trocar foto",
    petPictureRemove: "Remover",
    petPictureHint: "JPG, PNG, WEBP ou GIF — até 5 MB.",
    petBirthdate: "Data de nascimento",
    guardianName: "Nome do tutor",
    guardianPhone: "Celular",
    guardianEmailOptional: "E-mail (opcional)",
    socialPlaceholder: "@usuario",
    optional: "opcional",
    submit: "Publicar",
    submitting: "Enviando...",
    errorMissing: "Preencha todos os campos obrigatórios.",
    errorPicture: "Selecione uma foto do pet.",
    errorPictureType: "Formato não suportado. Use JPG, PNG, WEBP ou GIF.",
    errorPictureSize: "A foto excede 5 MB. Escolha um arquivo menor.",
    errorBirthdate: "Data de nascimento inválida.",
    statusEmpty: "vazio — pronto para cadastro",
    statusFilled: "preenchido",
  },
  "en-US": {
    guardianContact: "Guardian Contact",
    guardianOther: "Other guardian in the family",
    name: "Name",
    email: "Email",
    cellphone: "Cellphone",
    social: "Social",
    close: "Close",
    actionCall: "Call",
    actionCallTooltip: "Click this button to call the guardian",
    actionEmail: "Send email",
    actionWhatsApp: "Open WhatsApp",
    yearsOld: (n) => (n === 1 ? "1 year old" : `${n} years old`),
    monthsOld: (n) => (n === 1 ? "1 month old" : `${n} months old`),
    notFoundTitle: "Pet not found",
    notFoundBody:
      "We couldn't find a pet with that identifier. Please check the link and try again.",
    backHome: "Back to home",
    landingTitle: "View Pet",
    landingBody: "Visit /view/<hashId> to see a pet's public profile.",
    tryExamples: "Try these examples:",
    formTitle: "Set up this pet",
    formIntro: (id) =>
      `This page (${id}) is reserved but has no data yet. Fill in the fields below to publish.`,
    petSection: "About the pet",
    guardianSection: "Guardian contact",
    socialSectionOptional: "Social (optional)",
    petName: "Pet name",
    petPicture: "Pet picture",
    petPictureDropzone: "Drag a photo here",
    petPictureCamera: "Take a photo now",
    petPictureBrowseBtn: "Choose from device",
    petPictureReplace: "Replace photo",
    petPictureRemove: "Remove",
    petPictureHint: "JPG, PNG, WEBP or GIF — up to 5 MB.",
    petBirthdate: "Birthdate",
    guardianName: "Guardian name",
    guardianPhone: "Phone",
    guardianEmailOptional: "Email (optional)",
    socialPlaceholder: "@username",
    optional: "optional",
    submit: "Publish",
    submitting: "Submitting...",
    errorMissing: "Please fill in all required fields.",
    errorPicture: "Please select a photo of the pet.",
    errorPictureType: "Unsupported format. Use JPG, PNG, WEBP or GIF.",
    errorPictureSize: "The photo is over 5 MB. Pick a smaller file.",
    errorBirthdate: "Invalid birthdate.",
    statusEmpty: "empty — ready for setup",
    statusFilled: "filled",
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * Checks if a value is a valid locale code, including legacy aliases.
 */
export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Normalizes a locale string to a supported Locale.
 * Handles both full locale codes (pt-BR, en-US) and legacy simplified codes (pt, en).
 * Returns the normalized locale or undefined if not supported.
 */
export function normalizeLocale(value: string): Locale | undefined {
  // Check if it's already a valid full locale code
  if (isLocale(value)) return value;

  // Check if it's a legacy alias
  const normalized = LOCALE_ALIASES[value.toLowerCase()];
  if (normalized) return normalized;

  // Try extracting the language part from locale codes like "pt-PT" → "pt" → "pt-BR"
  const langPart = value.toLowerCase().split("-")[0];
  return LOCALE_ALIASES[langPart];
}
