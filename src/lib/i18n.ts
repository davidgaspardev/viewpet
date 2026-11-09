/**
 * Pure i18n module — no Next.js server-only deps so it can be imported
 * by Client Components. Locale resolution that needs request headers
 * lives in `i18n.server.ts`.
 */

import { TAG_ROUTE } from "./utils/routes";

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
  /** Label of a guardian's first number when they list several. */
  cellphoneMain: string;
  /** Label of the n-th number (n ≥ 2). */
  cellphoneNumber: (n: number) => string;
  social: string;
  close: string;
  actionCall: string;
  actionCallTooltip: string;
  actionEmail: string;
  actionWhatsApp: string;
  actionTelegram: string;
  yearsOld: (n: number) => string;
  monthsOld: (n: number) => string;
  notFoundTitle: string;
  notFoundBody: string;
  backHome: string;
  landingTitle: string;
  landingBody: string;
  tryExamples: string;
  // Form (reserved entry → cadastro)
  formTitle: string;
  formLead: string;
  formTagLabel: string;
  formStepsTitle: string;
  formSteps: ReadonlyArray<{ title: string; body: string }>;
  formPublicNotice: string;
  requiredLegend: string;
  petSectionHint: string;
  petDetailsHint: string;
  guardianSectionHint: string;
  petNameHint: string;
  petNamePlaceholder: string;
  petBreedHint: string;
  petPictureTip: string;
  guardianNameHint: string;
  guardianNamePlaceholder: string;
  guardianEmailHint: string;
  guardianEmailPlaceholder: string;
  phoneHint: string;
  phoneChannelsLabel: string;
  socialHint: string;
  addGuardianHint: string;
  submitNotice: string;
  petSection: string;
  guardianSection: string;
  socialSectionOptional: string;
  petName: string;
  petGender: string;
  genderMale: string;
  genderFemale: string;
  petBreed: string;
  petBreedPlaceholder: string;
  petDetailsSection: string;
  petAllergies: string;
  petAllergiesPlaceholder: string;
  petAllergiesHint: string;
  petAllergiesLimit: (max: number) => string;
  removeAllergy: (allergy: string) => string;
  petAbout: string;
  petAboutPlaceholder: string;
  aboutPet: (petName: string) => string;
  petPicture: string;
  petPictureDropzone: string;
  petPictureCamera: string;
  petPictureBrowseBtn: string;
  petPictureReplace: string;
  petPictureRemove: string;
  petPictureHint: string;
  petBirthdate: string;
  petBirthdatePlaceholder: string;
  petBirthdateHint: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmailOptional: string;
  addGuardian: string;
  removeGuardian: string;
  guardianNumber: (n: number) => string;
  phoneChannelCall: string;
  phoneChannelRequired: string;
  phoneIncomplete: string;
  addPhone: string;
  removePhone: string;
  removePhoneNumber: (n: number) => string;
  socialPlaceholder: string;
  optional: string;
  submit: string;
  submitting: string;
  errorMissing: string;
  errorPicture: string;
  errorPictureType: string;
  errorPictureSize: string;
  errorBirthdate: string;
  errorBirthdateIncomplete: string;
  errorBirthdateFuture: string;
  errorBirthdateTooOld: string;
  errorPhone: string;
  errorPhoneChannels: string;
  errorDetails: string;
  // Link previews (Open Graph / Twitter)
  ogDescription: (petName: string) => string;
  ogGenericDescription: string;
  // Landing status
  statusReserved: string;
  statusActive: string;
  statusLost: string;
  // Lost-pet banner
  lostBadge: string;
  lostHeadline: (petName: string) => string;
  lostBody: string;
  lostCallPrimary: (guardianFirstName: string) => string;
  lostWhatsApp: string;
  lostTelegram: string;
  lostOtherGuardian: string;
};

const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": {
    guardianContact: "Meu Tutor",
    guardianOther: "Outro tutor da família",
    name: "Nome",
    email: "E-mail",
    cellphone: "Celular",
    cellphoneMain: "Celular principal",
    cellphoneNumber: (n) => `Celular ${n}`,
    social: "Redes sociais",
    close: "Fechar",
    actionCall: "Ligar",
    actionCallTooltip: "Clique neste botão para ligar para o tutor",
    actionEmail: "Enviar e-mail",
    actionWhatsApp: "Abrir WhatsApp",
    actionTelegram: "Abrir Telegram",
    yearsOld: (n) => (n === 1 ? "1 ano" : `${n} anos`),
    monthsOld: (n) => (n === 1 ? "1 mês" : `${n} meses`),
    notFoundTitle: "Pet não encontrado",
    notFoundBody:
      "Não encontramos nenhum pet com esse identificador. Verifique o link e tente novamente.",
    backHome: "Voltar ao início",
    landingTitle: "View Pet",
    landingBody: `Acesse ${TAG_ROUTE}/<hashId> para visualizar a página pública de um pet.`,
    tryExamples: "Exemplos para testar:",
    formTitle: "Cadastre seu pet",
    formLead:
      "Preencha uma vez e a plaquinha já funciona: quem escanear o QR vê a página do seu pet e consegue falar com você.",
    formTagLabel: "Plaquinha",
    formStepsTitle: "Como funciona",
    formSteps: [
      {
        title: "Preencha os dados",
        body: "Leva poucos minutos. Só o essencial é obrigatório: nome, sexo, raça, foto, nascimento e um contato.",
      },
      {
        title: "Publicamos a página",
        body: "Ao tocar em Publicar, a página do seu pet entra no ar na hora.",
      },
      {
        title: "Quem achar fala com você",
        body: "Basta escanear o QR da plaquinha para ver as informações e ligar ou mandar mensagem para o tutor.",
      },
    ],
    formPublicNotice:
      "Tudo o que você preencher aparece na página pública do pet, para qualquer pessoa que escanear o QR — inclusive os contatos do tutor. Confira os dados antes de publicar.",
    requiredLegend: "Campos com * são obrigatórios.",
    petSectionHint: "É o que aparece no topo da página pública.",
    petDetailsHint: "Opcional, mas ajuda quem cuidar do pet numa emergência — e o veterinário.",
    guardianSectionHint: "Quem encontrar o pet usa estes contatos. É a parte mais importante.",
    petNameHint: "Como seu pet é chamado.",
    petNamePlaceholder: "Ex.: Thor",
    petBreedHint: "Digite e escolha uma sugestão, ou escreva a sua. Sem raça definida? Use SRD.",
    petPictureTip: "Uma foto nítida, de frente e com boa luz ajuda quem encontrar o pet a reconhecê-lo.",
    guardianNameHint: "A pessoa que deve ser procurada.",
    guardianNamePlaceholder: "Ex.: Maria Silva",
    guardianEmailHint: "Aparece na página pública, com um botão para enviar e-mail.",
    guardianEmailPlaceholder: "nome@exemplo.com",
    phoneHint: "É o número em destaque. Marque como você aceita ser contatado.",
    phoneChannelsLabel: "Pode ser contatado por",
    socialHint: "Aparecem como links na página pública.",
    addGuardianHint: "Pet de família? A segunda pessoa também aparece como contato.",
    submitNotice: "Ao publicar, a página fica pública para quem escanear a plaquinha.",
    petSection: "Seu pet",
    guardianSection: "Contato do tutor",
    socialSectionOptional: "Redes sociais (opcional)",
    petName: "Nome do pet",
    petGender: "Sexo",
    genderMale: "Macho",
    genderFemale: "Fêmea",
    petBreed: "Raça",
    petBreedPlaceholder: "Ex.: Shih Tzu, SRD…",
    petDetailsSection: "Mais detalhes",
    petAllergies: "Alergias",
    petAllergiesPlaceholder: "Ex.: frango, pólen…",
    petAllergiesHint: "Digite e pressione Enter para adicionar.",
    petAllergiesLimit: (max) => `Limite de ${max} alergias atingido.`,
    removeAllergy: (allergy) => `Remover alergia: ${allergy}`,
    petAbout: "Sobre",
    petAboutPlaceholder: "Personalidade, hábitos, cuidados especiais…",
    aboutPet: (petName) => `Sobre ${petName}`,
    petPicture: "Foto do pet",
    petPictureDropzone: "Arraste uma foto aqui",
    petPictureCamera: "Tirar foto agora",
    petPictureBrowseBtn: "Escolher do dispositivo",
    petPictureReplace: "Trocar foto",
    petPictureRemove: "Remover",
    petPictureHint: "JPG, PNG, WEBP ou GIF — até 5 MB.",
    petBirthdate: "Data de nascimento",
    petBirthdatePlaceholder: "DD/MM/AAAA",
    petBirthdateHint: "Digite dia, mês e ano. Ex.: 21/04/2018",
    guardianName: "Nome do tutor",
    guardianPhone: "Celular",
    guardianEmailOptional: "E-mail (opcional)",
    addGuardian: "Adicionar tutor",
    removeGuardian: "Remover",
    guardianNumber: (n) => `Tutor ${n}`,
    phoneChannelCall: "Chamadas",
    phoneChannelRequired: "Escolha pelo menos uma forma de contato.",
    phoneIncomplete: "Digite o número com DDD (10 ou 11 dígitos).",
    addPhone: "Adicionar outro número",
    removePhone: "Remover",
    removePhoneNumber: (n) => `Remover celular ${n}`,
    socialPlaceholder: "@usuario",
    optional: "opcional",
    submit: "Publicar",
    submitting: "Enviando...",
    errorMissing: "Preencha todos os campos obrigatórios.",
    errorPicture: "Selecione uma foto do pet.",
    errorPictureType: "Formato não suportado. Use JPG, PNG, WEBP ou GIF.",
    errorPictureSize: "A foto excede 5 MB. Escolha um arquivo menor.",
    errorBirthdate: "Data de nascimento inválida.",
    errorBirthdateIncomplete: "Digite a data completa (dia/mês/ano).",
    errorBirthdateFuture: "A data não pode estar no futuro.",
    errorBirthdateTooOld: "Essa data é muito antiga. Confira o ano.",
    errorDetails: "Confira raça, alergias e sobre — algum valor está longo demais.",
    errorPhone: "Confira os celulares: digite o número com DDD (10 ou 11 dígitos).",
    errorPhoneChannels:
      "Escolha pelo menos uma forma de contato (chamada, WhatsApp ou Telegram) para cada celular.",
    ogDescription: (petName) => `Perfil de ${petName}. Contate o tutor pelo link.`,
    ogGenericDescription: "Veja as informações do seu pet e do dono em uma página pública.",
    statusReserved: "reservado — pronto para cadastro",
    statusActive: "ativo",
    statusLost: "perdido",
    lostBadge: "PERDIDO",
    lostHeadline: (petName) => `${petName} está perdido`,
    lostBody:
      "Você o encontrou? Ligue para o tutor agora — qualquer informação ajuda.",
    lostCallPrimary: (firstName) => `Ligar para ${firstName}`,
    lostWhatsApp: "WhatsApp",
    lostTelegram: "Telegram",
    lostOtherGuardian: "Outro tutor",
  },
  "en-US": {
    guardianContact: "Guardian Contact",
    guardianOther: "Other guardian in the family",
    name: "Name",
    email: "Email",
    cellphone: "Cellphone",
    cellphoneMain: "Main cellphone",
    cellphoneNumber: (n) => `Cellphone ${n}`,
    social: "Social",
    close: "Close",
    actionCall: "Call",
    actionCallTooltip: "Click this button to call the guardian",
    actionEmail: "Send email",
    actionWhatsApp: "Open WhatsApp",
    actionTelegram: "Open Telegram",
    yearsOld: (n) => (n === 1 ? "1 year old" : `${n} years old`),
    monthsOld: (n) => (n === 1 ? "1 month old" : `${n} months old`),
    notFoundTitle: "Pet not found",
    notFoundBody:
      "We couldn't find a pet with that identifier. Please check the link and try again.",
    backHome: "Back to home",
    landingTitle: "View Pet",
    landingBody: `Visit ${TAG_ROUTE}/<hashId> to see a pet's public profile.`,
    tryExamples: "Try these examples:",
    formTitle: "Set up your pet",
    formLead:
      "Fill this in once and the tag works: anyone who scans the QR sees your pet's page and can get in touch with you.",
    formTagLabel: "Tag",
    formStepsTitle: "How it works",
    formSteps: [
      {
        title: "Fill in the details",
        body: "It takes a few minutes. Only the essentials are required: name, gender, breed, photo, birthdate and one contact.",
      },
      {
        title: "We publish the page",
        body: "The moment you tap Publish, your pet's page goes live.",
      },
      {
        title: "Whoever finds them reaches you",
        body: "They just scan the tag's QR to see the details and call or message the guardian.",
      },
    ],
    formPublicNotice:
      "Everything you fill in appears on the pet's public page, to anyone who scans the QR — including the guardian's contacts. Check the details before publishing.",
    requiredLegend: "Fields marked * are required.",
    petSectionHint: "This is what shows at the top of the public page.",
    petDetailsHint: "Optional, but it helps whoever looks after the pet in an emergency — and the vet.",
    guardianSectionHint: "Whoever finds the pet uses these contacts. This is the most important part.",
    petNameHint: "What your pet is called.",
    petNamePlaceholder: "E.g. Buddy",
    petBreedHint: "Type and pick a suggestion, or write your own. Not sure? Choose Mixed breed.",
    petPictureTip: "A clear, front-facing photo in good light helps whoever finds the pet recognise them.",
    guardianNameHint: "The person to reach out to.",
    guardianNamePlaceholder: "E.g. Jane Smith",
    guardianEmailHint: "Shown on the public page, with a button to send an email.",
    guardianEmailPlaceholder: "name@example.com",
    phoneHint: "This is the number shown first. Tick how you are happy to be contacted.",
    phoneChannelsLabel: "Can be reached by",
    socialHint: "Shown as links on the public page.",
    addGuardianHint: "Family pet? The second person is listed as a contact too.",
    submitNotice: "Once published, the page is public to anyone who scans the tag.",
    petSection: "Your pet",
    guardianSection: "Guardian contact",
    socialSectionOptional: "Social (optional)",
    petName: "Pet name",
    petGender: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    petBreed: "Breed",
    petBreedPlaceholder: "E.g. Shih Tzu, mixed breed…",
    petDetailsSection: "More details",
    petAllergies: "Allergies",
    petAllergiesPlaceholder: "E.g. chicken, pollen…",
    petAllergiesHint: "Type and press Enter to add.",
    petAllergiesLimit: (max) => `Limit of ${max} allergies reached.`,
    removeAllergy: (allergy) => `Remove allergy: ${allergy}`,
    petAbout: "About",
    petAboutPlaceholder: "Personality, habits, special care…",
    aboutPet: (petName) => `About ${petName}`,
    petPicture: "Pet picture",
    petPictureDropzone: "Drag a photo here",
    petPictureCamera: "Take a photo now",
    petPictureBrowseBtn: "Choose from device",
    petPictureReplace: "Replace photo",
    petPictureRemove: "Remove",
    petPictureHint: "JPG, PNG, WEBP or GIF — up to 5 MB.",
    petBirthdate: "Birthdate",
    petBirthdatePlaceholder: "DD/MM/YYYY",
    petBirthdateHint: "Type day, month and year. E.g. 21/04/2018",
    guardianName: "Guardian name",
    guardianPhone: "Phone",
    guardianEmailOptional: "Email (optional)",
    addGuardian: "Add guardian",
    removeGuardian: "Remove",
    guardianNumber: (n) => `Guardian ${n}`,
    phoneChannelCall: "Calls",
    phoneChannelRequired: "Choose at least one way to be contacted.",
    phoneIncomplete: "Enter the number with area code (10 or 11 digits).",
    addPhone: "Add another number",
    removePhone: "Remove",
    removePhoneNumber: (n) => `Remove cellphone ${n}`,
    socialPlaceholder: "@username",
    optional: "optional",
    submit: "Publish",
    submitting: "Submitting...",
    errorMissing: "Please fill in all required fields.",
    errorPicture: "Please select a photo of the pet.",
    errorPictureType: "Unsupported format. Use JPG, PNG, WEBP or GIF.",
    errorPictureSize: "The photo is over 5 MB. Pick a smaller file.",
    errorBirthdate: "Invalid birthdate.",
    errorBirthdateIncomplete: "Enter the full date (day/month/year).",
    errorBirthdateFuture: "The date can't be in the future.",
    errorBirthdateTooOld: "That date is too far in the past. Check the year.",
    errorDetails: "Check breed, allergies and about — a value is too long.",
    errorPhone: "Check the cellphones: enter each number with area code (10 or 11 digits).",
    errorPhoneChannels:
      "Choose at least one way to be contacted (call, WhatsApp or Telegram) for each cellphone.",
    ogDescription: (petName) => `${petName}'s profile. Contact the guardian through the link.`,
    ogGenericDescription: "See your pet's and guardian's information on a public page.",
    statusReserved: "reserved — ready for setup",
    statusActive: "active",
    statusLost: "lost",
    lostBadge: "LOST",
    lostHeadline: (petName) => `${petName} is missing`,
    lostBody:
      "Did you find them? Call the guardian now — any information helps.",
    lostCallPrimary: (firstName) => `Call ${firstName}`,
    lostWhatsApp: "WhatsApp",
    lostTelegram: "Telegram",
    lostOtherGuardian: "Other guardian",
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
