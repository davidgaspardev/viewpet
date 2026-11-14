import { PRIVACY_PATH } from "@/lib/utils/routes";

import type { LegalContact } from "./config";
import type { LegalDocument } from "./types";
import { PRIVACY_VERSION } from "./versions";

/**
 * Privacy Policy (pt-BR). Everything it states about the data has to match what
 * the app does: the registration form collects the fields in "Quais dados
 * tratamos", and the pet page publishes them as "O que fica público" says.
 * Change this text together with `PRIVACY_VERSION`.
 *
 * Written against the LGPD (Lei 13.709/2018): art. 9 (what must be told to the
 * data subject), art. 7 and 8 (legal bases, consent), art. 18 (rights),
 * art. 33 (transfers abroad), art. 41 (contact of the controller).
 */
export function privacyDocument(contact: LegalContact): LegalDocument {
  const controller = contact.entityName ?? "o ViewPet";
  const controllerWithDocument = contact.document ? `${controller} (${contact.document})` : controller;

  return {
    path: PRIVACY_PATH,
    title: "Política de Privacidade",
    version: PRIVACY_VERSION,
    intro:
      "Esta política explica quais dados pessoais o ViewPet trata, para quê, com quem os compartilha e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).",
    sections: [
      {
        id: "quem-trata",
        title: "Quem trata os seus dados",
        paragraphs: [
          "O ViewPet liga uma plaquinha com QR Code, presa à coleira do pet, a uma página pública com as informações do pet e os contatos do tutor. Quem encontra o pet escaneia o QR Code e fala com o tutor.",
          `O controlador dos dados pessoais, isto é, quem decide como eles são tratados, é ${controllerWithDocument}.`,
          ...(contact.email
            ? [`Canal para exercer seus direitos e tirar dúvidas sobre privacidade: ${contact.email}.`]
            : []),
          ...(contact.officerName
            ? [`Encarregado pelo tratamento de dados pessoais (art. 41 da LGPD): ${contact.officerName}.`]
            : []),
        ],
      },
      {
        id: "dados",
        title: "Quais dados tratamos",
        items: [
          "Dados do pet: nome, foto, data de nascimento, sexo, raça e, se você preencher, alergias e um texto livre sobre o pet.",
          "Dados dos tutores (até dois por pet): nome, até três números de celular por tutor com as formas de contato que você aceita (chamada, WhatsApp ou Telegram) e, se você preencher, e-mail e perfis em redes sociais (Instagram, X, Facebook, TikTok).",
          "O registro do seu aceite: a data e a hora do cadastro e as versões dos Termos de Uso e desta política que você viu.",
          "Dados técnicos: um cookie de 60 segundos (veja a seção Cookies) e os registros de acesso (endereço IP, data e hora, navegador) que o provedor de hospedagem mantém para segurança e funcionamento.",
        ],
        closing: [
          "Não pedimos dados pessoais sensíveis (art. 5º, II, da LGPD) nem documentos. No campo de texto livre e na foto, evite informações sobre saúde, religião, opinião política ou documentos de pessoas, e fotos em que apareçam pessoas, sobretudo crianças.",
        ],
      },
      {
        id: "finalidades",
        title: "Para que usamos os dados e em que base legal",
        items: [
          "Criar e manter a página pública do pet, para que quem o encontre consiga falar com o tutor. Bases legais: execução do serviço que você pediu (art. 7º, V) e o seu consentimento para publicar os dados de contato (art. 7º, I).",
          "Guardar a prova do seu aceite, porque cabe a nós demonstrar que o consentimento foi dado (art. 8º, §2º). Bases legais: cumprimento de obrigação legal e exercício regular de direitos (art. 7º, II e VI).",
          "Manter o serviço seguro e funcionando, por exemplo com registros de acesso e prevenção de abuso. Bases legais: legítimo interesse (art. 7º, IX) e, quando houver, obrigação legal (art. 7º, II).",
        ],
        closing: [
          "Não vendemos os dados, não os usamos para publicidade nem para montar perfis, e não os usamos para outra finalidade sem avisar você antes (art. 6º, I e II, e art. 8º, §6º).",
        ],
      },
      {
        id: "publico",
        title: "O que fica público",
        items: [
          "A página do pet é pública: qualquer pessoa com o QR Code ou o link a abre, sem cadastro. Tudo o que você preenche aparece nela, inclusive os dados dos tutores.",
          "Na tela, os números de celular aparecem parcialmente ocultos, mas os botões de ligar e de abrir o WhatsApp ou o Telegram usam o número completo. Na prática, quem abre a página consegue o número inteiro.",
          "A página não é indexada por buscadores. As prévias de link (WhatsApp, Telegram, redes sociais) mostram só o nome e a foto do pet, nunca os contatos.",
        ],
        closing: [
          "Depois que alguém vê ou copia uma informação pública, não temos como apagá-la do aparelho ou dos arquivos de quem a copiou. Publique só o que você aceita que seja visto.",
        ],
      },
      {
        id: "outras-pessoas",
        title: "Dados de outras pessoas",
        paragraphs: [
          "Se você cadastra um segundo tutor, está informando dados de outra pessoa. Faça isso só com a autorização dela, que você declara ter ao marcar a caixa de autorização no cadastro.",
          "Essa pessoa tem os mesmos direitos que você (veja Seus direitos) e pode pedir pelo canal desta política a correção ou a remoção do próprio contato.",
        ],
      },
      {
        id: "compartilhamento",
        title: "Com quem compartilhamos",
        items: [
          "Provedores que operam o serviço em nosso nome (operadores): hospedagem e entrega do site, banco de dados e armazenamento das fotos. Eles só podem usar os dados para prestar esses serviços.",
          "Qualquer pessoa que abra a página, no que ela mostra, como descrito em O que fica público.",
          "Autoridades, quando a lei ou uma ordem judicial exigir.",
        ],
        closing: [
          "O WhatsApp, o Telegram e a operadora de telefonia só entram quando alguém toca num dos botões de contato. A partir daí, a conversa segue as regras desses serviços, não as nossas.",
        ],
      },
      {
        id: "exterior",
        title: "Transferência para fora do Brasil",
        paragraphs: [
          "Alguns dos provedores podem guardar ou processar dados em servidores fora do Brasil. Quando isso acontece, a transferência segue o art. 33 da LGPD, com as garantias que ele prevê.",
        ],
      },
      {
        id: "cookies",
        title: "Cookies",
        paragraphs: [
          "Usamos um único cookie, chamado qr_scan. Ele dura 60 segundos e só indica que a visita veio de um QR Code escaneado. Não identifica você e hoje não serve a publicidade nem a estatística. Por ser necessário ao funcionamento, não depende de consentimento.",
          "Não usamos cookies de análise nem de publicidade.",
        ],
      },
      {
        id: "retencao",
        title: "Por quanto tempo guardamos",
        paragraphs: [
          "Guardamos os dados enquanto a página do pet estiver publicada. Se você pedir a remoção da página ou revogar o consentimento, tiramos a página do ar e eliminamos os dados em até 15 dias (art. 15 e art. 16 da LGPD).",
          "Guardamos por mais tempo só o que a lei exigir, como os registros de acesso do provedor, pelo prazo legal.",
        ],
      },
      {
        id: "direitos",
        title: "Seus direitos",
        paragraphs: ["Pelo art. 18 da LGPD, você pode pedir a qualquer momento:"],
        items: [
          "a confirmação de que tratamos seus dados;",
          "o acesso a eles;",
          "a correção de dados incompletos, inexatos ou desatualizados;",
          "a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em desacordo com a lei;",
          "a portabilidade dos dados;",
          "a eliminação dos dados tratados com o seu consentimento;",
          "a informação sobre com quem compartilhamos os dados;",
          "a informação sobre a possibilidade de não consentir e sobre as consequências disso;",
          "a revogação do consentimento.",
        ],
        closing: [
          "Para exercer qualquer um deles, escreva para o canal indicado em Quem trata os seus dados. O atendimento é gratuito e respondemos em até 15 dias (art. 19, II). Podemos pedir informações para confirmar que você é a pessoa a quem os dados se referem, para que ninguém peça o acesso ou a remoção dos dados de outra pessoa.",
          "Você também pode apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD), em www.gov.br/anpd.",
        ],
      },
      {
        id: "revogacao",
        title: "Revogar o consentimento",
        paragraphs: [
          "Você pode retirar o consentimento quando quiser, de forma gratuita e fácil, pelo mesmo canal. Sem a autorização para publicar os dados de contato a página do pet não pode existir. Por isso, revogar significa tirar a página do ar e eliminar os dados, e o QR Code da plaquinha deixa de mostrar as informações do pet.",
          "A revogação não desfaz o que foi tratado antes dela. Se você não aceitar publicar os dados no cadastro, não é possível criar a página do pet.",
        ],
      },
      {
        id: "seguranca",
        title: "Segurança",
        paragraphs: [
          "Adotamos medidas técnicas e administrativas para proteger os dados de acessos não autorizados e de situações acidentais ou ilícitas (art. 46 da LGPD): conexão criptografada (HTTPS) e acesso restrito ao painel administrativo e ao banco de dados.",
          "Se ocorrer um incidente de segurança que possa causar risco ou dano relevante, avisamos você e a ANPD, como exige o art. 48 da LGPD.",
        ],
      },
      {
        id: "menores",
        title: "Crianças e adolescentes",
        paragraphs: [
          "O cadastro é para maiores de 18 anos. Se o tutor for menor de idade, o cadastro deve ser feito por um responsável legal, com o consentimento específico exigido pelo art. 14 da LGPD. Se soubermos de dados de uma criança ou de um adolescente tratados sem esse consentimento, removemos a página.",
        ],
      },
      {
        id: "mudancas",
        title: "Mudanças nesta política",
        paragraphs: [
          "Esta política tem uma versão e uma data. Quando mudarmos algo importante, como a finalidade ou o compartilhamento dos dados, atualizamos a versão, avisamos pelos contatos cadastrados e pedimos novo aceite quando a lei exigir, para que você possa revogar o consentimento se não concordar (art. 8º, §6º).",
        ],
      },
    ],
  };
}
