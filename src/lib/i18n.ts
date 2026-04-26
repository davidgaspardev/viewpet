/**
 * Pure i18n module — no Next.js server-only deps so it can be imported
 * by Client Components. Locale resolution that needs request headers
 * lives in `i18n.server.ts`.
 */

export const SUPPORTED_LOCALES = ["pt", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt";

type Dictionary = {
  ownerContact: string;
  name: string;
  email: string;
  cellphone: string;
  social: string;
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
  ownerSection: string;
  socialSectionOptional: string;
  petName: string;
  petPicture: string;
  petPictureDropzone: string;
  petPictureBrowse: string;
  petPictureCamera: string;
  petPictureReplace: string;
  petPictureRemove: string;
  petPictureHint: string;
  petBirthdate: string;
  ownerName: string;
  ownerPhone: string;
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
  pt: {
    ownerContact: "Contato do Dono",
    name: "Nome",
    email: "E-mail",
    cellphone: "Celular",
    social: "Redes sociais",
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
    ownerSection: "Contato do dono",
    socialSectionOptional: "Redes sociais (opcional)",
    petName: "Nome do pet",
    petPicture: "Foto do pet",
    petPictureDropzone: "Arraste uma foto aqui",
    petPictureBrowse: "ou clique para escolher do dispositivo",
    petPictureCamera: "Tirar foto agora",
    petPictureReplace: "Trocar foto",
    petPictureRemove: "Remover",
    petPictureHint: "JPG, PNG, WEBP ou GIF — até 5 MB.",
    petBirthdate: "Data de nascimento",
    ownerName: "Nome do dono",
    ownerPhone: "Celular",
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
  en: {
    ownerContact: "Owner Contact",
    name: "Name",
    email: "Email",
    cellphone: "Cellphone",
    social: "Social",
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
    ownerSection: "Owner contact",
    socialSectionOptional: "Social (optional)",
    petName: "Pet name",
    petPicture: "Pet picture",
    petPictureDropzone: "Drag a photo here",
    petPictureBrowse: "or click to choose from your device",
    petPictureCamera: "Take a photo now",
    petPictureReplace: "Replace photo",
    petPictureRemove: "Remove",
    petPictureHint: "JPG, PNG, WEBP or GIF — up to 5 MB.",
    petBirthdate: "Birthdate",
    ownerName: "Owner name",
    ownerPhone: "Cellphone",
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

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
