import { TERMS_PATH } from "@/lib/utils/routes";

import type { LegalContact } from "./config";
import type { LegalDocument } from "./types";
import { TERMS_VERSION } from "./versions";

/**
 * Terms of Use (pt-BR). What it says the tutor does and what the page shows has
 * to match the registration form and the pet page. Change this text together
 * with `TERMS_VERSION`.
 */
export function termsDocument(contact: LegalContact): LegalDocument {
  const provider = contact.entityName ?? "o ViewPet";

  return {
    path: TERMS_PATH,
    title: "Termos de Uso",
    version: TERMS_VERSION,
    intro:
      "Estes termos regem o uso do ViewPet, em especial o cadastro do pet e a página pública que ele cria. Leia com atenção antes de publicar.",
    sections: [
      {
        id: "aceite",
        title: "Aceite",
        paragraphs: [
          "Ao marcar a caixa de aceite e publicar o cadastro, você concorda com estes termos e declara ter lido a Política de Privacidade. Se não concordar, não publique o cadastro.",
        ],
      },
      {
        id: "servico",
        title: "O que é o ViewPet",
        paragraphs: [
          `O ViewPet, oferecido por ${provider}, liga uma plaquinha com QR Code, presa à coleira do pet, a uma página pública. Quem encontra o pet escaneia o QR Code, vê as informações que o tutor cadastrou e fala com ele por ligação, WhatsApp ou Telegram. Não é preciso instalar aplicativo nem criar conta para ver a página.`,
        ],
      },
      {
        id: "quem-pode",
        title: "Quem pode cadastrar",
        items: [
          "Maiores de 18 anos. Menores de idade só com um responsável legal, que faz o cadastro por eles.",
          "O tutor do pet ou quem tem autorização dele para cadastrá-lo.",
          "Cada plaquinha tem um QR Code único e só pode ser cadastrada uma vez.",
        ],
      },
      {
        id: "responsabilidades",
        title: "O que você se compromete a fazer",
        items: [
          "Informar dados verdadeiros e atuais, e pedir a correção quando algo mudar, por exemplo um número de celular.",
          "Ter a autorização das pessoas cujos dados você informa, como o segundo tutor, e das pessoas que aparecem na foto, se houver.",
          "Enviar só uma foto do pet, sem pessoas identificáveis sem a autorização delas, e não incluir no texto livre dados sensíveis ou documentos de ninguém.",
          "Não publicar conteúdo ilegal, ofensivo, enganoso ou que viole direitos de terceiros, e não se passar por outra pessoa.",
        ],
      },
      {
        id: "pagina-publica",
        title: "A página pública",
        paragraphs: [
          "A página do pet é pública: qualquer pessoa com o QR Code ou o link a abre e vê tudo o que você preencheu, inclusive o nome e os telefones dos tutores. Os detalhes estão na Política de Privacidade.",
          "Você nos autoriza, de forma gratuita e só para esse fim, a guardar e a exibir o conteúdo do cadastro na página do pet, e o nome e a foto do pet nas prévias de link. O conteúdo continua sendo seu.",
        ],
      },
      {
        id: "quem-acessa",
        title: "Para quem acessa a página",
        paragraphs: [
          "Quem encontra o pet pode usar os contatos só para falar sobre o pet. É proibido usá-los para spam, propaganda, assédio, golpes, para reunir dados em massa ou para qualquer outro fim.",
        ],
      },
      {
        id: "remocao",
        title: "Remoção e encerramento",
        paragraphs: [
          "Você pode pedir a remoção da página e a eliminação dos dados a qualquer momento, pelo canal da Política de Privacidade. A plaquinha deixa então de mostrar as informações do pet.",
          "Podemos suspender ou remover uma página que descumpra estes termos ou a lei, avisando o tutor quando for possível.",
        ],
      },
      {
        id: "disponibilidade",
        title: "Disponibilidade e limites",
        paragraphs: [
          "Não garantimos que um pet perdido será encontrado, nem que o serviço funcione sem interrupção ou sem erros: pode haver manutenção e falhas. Nos limites da lei, não respondemos pelo uso indevido dos dados por terceiros fora do nosso controle, nem por dados incorretos informados pelo tutor.",
          "Nada neste termo limita direitos que a lei garante ao consumidor.",
        ],
      },
      {
        id: "propriedade",
        title: "Propriedade intelectual",
        paragraphs: [
          "O nome, a marca, o logotipo, o site e o desenho da plaquinha pertencem ao ViewPet. Estes termos não transferem nenhum desses direitos a você.",
        ],
      },
      {
        id: "privacidade",
        title: "Privacidade",
        paragraphs: [
          "O tratamento dos dados pessoais é descrito na Política de Privacidade, que faz parte destes termos.",
        ],
      },
      {
        id: "mudancas",
        title: "Mudanças nos termos",
        paragraphs: [
          "Estes termos têm uma versão e uma data. Quando mudarem de forma relevante, atualizamos a versão e avisamos os tutores cadastrados pelos contatos que temos. Mudanças relevantes valem para novos cadastros ou depois de novo aceite.",
        ],
      },
      {
        id: "foro",
        title: "Lei aplicável e foro",
        paragraphs: [
          "Valem as leis do Brasil. Se houver relação de consumo, o foro é o do domicílio do consumidor. Nos demais casos, é o foro competente segundo a lei.",
        ],
      },
    ],
  };
}
