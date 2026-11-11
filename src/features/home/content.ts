import { getDictionary } from "@/lib/i18n";
import { MAX_PHONES_PER_GUARDIAN } from "@/lib/utils/phone";
import { MAX_GUARDIANS } from "@/types/pet";
import {
  DeviceMobileIcon,
  HeartIcon,
  LockIcon,
  PhoneIcon,
  QrCodeIcon,
  UsersIcon,
} from "@/ui/icons";

/**
 * Copy of the marketing home (pt-BR). Everything it says about the product
 * is something the app already does for a tutor — the registration form and
 * the public pet page — so a claim here should be checked against those before
 * it is changed. What the registration form already says (the
 * required fields, the public-data notice, the limits) is read from the
 * dictionary and the shared constants, not typed again.
 */

type Icon = typeof PhoneIcon;

const dict = getDictionary("pt-BR");

export const SECTION_IDS = {
  howItWorks: "como-funciona",
  petPage: "pagina-do-pet",
  tag: "plaquinha",
} as const;

export const NAV_LINKS = [
  { href: `#${SECTION_IDS.howItWorks}`, label: "Como funciona" },
  { href: `#${SECTION_IDS.petPage}`, label: "A página do pet" },
  { href: `#${SECTION_IDS.tag}`, label: "A plaquinha" },
] as const;

export const HERO = {
  eyebrow: "Identificação inteligente para pets",
  title: "Seu pet se perdeu?",
  highlight: "Quem achar fala com você.",
  lead: "Uma plaquinha de metal com QR Code na coleira. Quem encontrar escaneia com a câmera do celular e abre a página do seu pet: nome, cuidados e o jeito mais rápido de falar com você. Sem aplicativo.",
  demoCta: "Ver uma página de exemplo",
  howCta: "Entenda como funciona",
  reassurance: ["Sem app para instalar", "Você decide o que aparece"],
} as const;

export const PET_PAGE = {
  eyebrow: "A página do pet",
  title: "Tudo o que importa, na tela de quem encontrou.",
  lead: "Cada plaquinha abre uma página pública com o que ajuda a trazer o pet de volta e a cuidar dele até lá.",
  features: [
    {
      icon: PhoneIcon,
      title: "Fale com o tutor na hora",
      body: "Ligação, WhatsApp ou Telegram: cada número escolhe como pode ser contatado, e a página mostra só os botões que você marcou.",
    },
    {
      icon: QrCodeIcon,
      title: "No ar na hora",
      body: dict.formSteps[1].body,
    },
    {
      icon: UsersIcon,
      title: "Pet de família",
      body: `Até ${MAX_GUARDIANS} tutores, cada um com até ${MAX_PHONES_PER_GUARDIAN} números. O principal aparece em destaque e os outros ficam um toque abaixo.`,
    },
    {
      icon: HeartIcon,
      title: "Cuidados e alergias",
      body: "Raça, alergias e um texto livre sobre o jeito do pet ajudam quem cuida dele numa emergência, e o veterinário.",
    },
    {
      icon: DeviceMobileIcon,
      title: "Sem aplicativo, sem cadastro",
      body: "Quem achou só precisa da câmera do celular. A página abre no navegador, em português ou inglês.",
    },
    {
      icon: LockIcon,
      title: "Você escolhe o que mostrar",
      body: "Só aparece o que você preenche: e-mail, redes sociais e detalhes do pet são opcionais, e o número sai parcialmente oculto na tela.",
    },
  ] satisfies ReadonlyArray<{ icon: Icon; title: string; body: string }>,
} as const;

export const HOW_IT_WORKS = {
  eyebrow: "Como funciona",
  title: "Um QR Code. Três passos.",
  steps: [
    {
      title: "Escaneie e cadastre",
      body: `Cada plaquinha tem um QR Code único. Escaneie e cadastre o pet. ${dict.formSteps[0].body}`,
    },
    {
      title: "Prenda na coleira",
      body: "O pingente de metal vai com o seu pet para onde ele for, com o QR Code sempre à mostra.",
    },
    {
      title: "Quem achar escaneia",
      body: "Com a câmera do celular, a pessoa abre a página, vê as informações e liga ou manda mensagem para você.",
    },
  ],
  notice: dict.formPublicNotice,
} as const;

export const TAG = {
  eyebrow: "A plaquinha",
  title: "Um pingente feito para o dia a dia.",
  lead: "Metal com um QR Code que leva à página digital do pet. Discreta na coleira, fácil de escanear.",
  traits: [
    { title: "Fácil de ler", body: "Esmalte escuro com o QR Code sobre fundo claro." },
    { title: "Resistente", body: "Metal inoxidável de alta durabilidade." },
    { title: "Conectada", body: "QR Code único que abre a página digital do pet." },
  ],
} as const;

export const FINAL_CTA = {
  title: "Dê ao seu pet um jeito de voltar para casa.",
  lead: "Veja como a página aparece para quem escaneia a plaquinha.",
  cta: "Ver uma página de exemplo",
} as const;

export const FOOTER = {
  tagline: "Identificação inteligente para pets.",
} as const;

export const PAGE_META = {
  title: "ViewPet: identificação inteligente para pets",
  description:
    "Plaquinha de metal com QR Code que abre a página do seu pet no celular de quem o encontrar: contatos do tutor, alergias e cuidados. Sem aplicativo.",
} as const;
