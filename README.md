# View Pet

MVP de uma página web pública que renderiza as informações de um pet a partir de um `hashId` na URL:

```
https://<domain>/tag/<hashId>
```

A página é o destino do QR Code impresso na plaquinha do pet — sem login, leitura pública, otimizada pra ser aberta por um estranho que encontrou o animal.

## Glossário

Os mesmos termos valem no código, nos tickets e na conversa.

| Termo | O que é | Onde aparece |
|-------|---------|--------------|
| **Tag** (plaquinha) | O objeto físico: a placa/pingente pendurado na coleira do pet, com o QR Code. É o que a pessoa que acha o animal escaneia. | Rota `/tag/<hashId>`, `src/app/tag/` |
| **QR Code** | O código impresso na tag. Gerado no `/admin`. Ver [URL do QR](#url-do-qr). | `src/lib/qrcode/`, `src/features/admin/` |
| **`hashId`** | O identificador opaco de 12 caracteres da tag. É também a chave do registro do pet no banco: um `hashId` ↔ uma tag ↔ um pet. Ver [Formato do `hashId`](#formato-do-hashid). | `src/lib/utils/ids.ts`, `id-format.ts` |
| **Reserva** | Gerar um `hashId` e guardá-lo no banco vazio, antes de existir pet. Acontece antes da impressão. | `bun run reserve`, página `/admin` |
| **Estado da tag** | `missing`, `reserved`, `active` ou `lost`. Ver [Estados de uma tag](#estados-de-uma-tag). | `PetEntry`, `getPetEntry()` |
| **Tutor** (guardian) | Quem cuida do pet e é contatado por quem o encontra. Um pet tem até 2; o primeiro é o principal. | `Guardian`, `src/types/pet.ts` |
| **Host curto** (`qr.`) | `qr.viewpet.info`: o endereço estável que vai no QR e só redireciona pra página real, pra poder mudar a página sem reimprimir nada. | `src/middleware.ts`, [Host curto do QR](#host-curto-do-qr-qrviewpetinfo) |
| **Scan** | Uma visita que chegou pelo QR (pelo host curto), em vez de por um link direto. O redirect marca com o cookie `qr_scan`; a página lê. | `src/features/qr-redirect/`, `src/lib/utils/qr-scan.ts` |
| **Aceite** | As duas caixas do cadastro (Termos de Uso e Política de Privacidade, e a autorização para publicar os dados). Fica gravado no pet como `consent`. | `src/features/legal/`, `src/features/pet-registration/components/ConsentFields.tsx` |
| **Home** | A página `/`: apresenta o produto (hero, como funciona, o que a página do pet mostra, a plaquinha). | `src/app/page.tsx`, `src/features/home/` |
| **Pendant** | O modelo 3D da tag (o pingente), em Rust/Bevy. Não está na `main`: é desenvolvido à parte, na branch `feat/pendant-rust`. | — |
| **`pet-tag`** | A feature web com a cena 3D da tag (Three.js). Fala do **desenho** da tag, não da rota `/tag`. Hoje nenhuma rota a usa (a home usa uma ilustração em CSS). | `src/features/pet-tag/` |

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, React 19)
- [Bun](https://bun.sh/) (runtime, package manager e script runner)
- TypeScript + Tailwind CSS
- MongoDB (produção) ou JSON em disco (dev/test)
- Imagens: filesystem (dev), AWS S3 ou Cloudflare R2 (produção)
- Three.js / React Three Fiber (cena 3D da tag)
- i18n próprio (PT-BR e EN-US)
- [nanoid](https://github.com/ai/nanoid) pra geração de hashIds opacos

## Rodando localmente

```bash
# 1. Dependências
bun install

# 2. (Opcional) MongoDB local — só pra DATABASE_PROVIDER=mongodb
docker-compose up -d mongodb

# 3. Popula dados de exemplo
bun run seed

# 4. Dev server
bun dev
```

App sobe em <http://localhost:3000>. Por padrão o banco é o arquivo `data/local.db.json` (provider `local`), então o passo 2 é opcional. Pra usar MongoDB: `DATABASE_PROVIDER=mongodb bun dev`.

Copie `.env.example` pra `.env.local` pra ajustar as variáveis (lista completa em [Variáveis de ambiente](#variáveis-de-ambiente)).

### Comandos

| Comando | Descrição |
|---------|-----------|
| `bun dev` | Servidor de desenvolvimento |
| `bun run dev:local` | Igual a `bun dev`, forçando `DATABASE_PROVIDER=local` |
| `bun run build` | Build de produção |
| `bun start` | Servidor de produção |
| `bun run lint` | Lint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | Roda os testes |
| `bun run seed` | Popula o banco com `src/data/pets.json` |
| `bun run seed --reset` | Limpa e re-popula (apenas provider `local`) |
| `bun run reserve [--count N]` | Reserva N hashIds vazios (padrão 1) e imprime um por linha |
| `bun run qr-logo` | Regenera `src/lib/qrcode/logo.ts` a partir de `public/logo.svg` |
| `bun run setup:localstack` | Cria o bucket no LocalStack (S3 local) |
| `bun run test:s3`, `test:s3-upload`, `test:r2-upload` | Scripts manuais de verificação do storage |

## Variáveis de ambiente

Modelo em `.env.example`.

| Variável | Padrão | Efeito |
|----------|--------|--------|
| `DATABASE_PROVIDER` | `local` | `local` ou `mongodb`. Lida uma vez, quando o repositório é criado. |
| `MONGODB_URI` | `mongodb://localhost:27017/viewpet` | Conexão do provider `mongodb`. |
| `STORAGE_PROVIDER` | `local` | `local`, `s3` ou `r2`. Ver [Armazenamento de imagens](#armazenamento-de-imagens). |
| `ADMIN_PASSWORD` | — | Senha do `/admin` (Basic auth). Sem ela, `/admin` responde `503`. |
| `SITE_URL` | origem da requisição | Site principal: destino do redirect, base da URL do QR, `metadataBase` do Open Graph e `canonical` da home. **Defina em produção.** |
| `QR_BASE_URL` | — | Host curto que vai no QR e redireciona. Exige `SITE_URL`. Ver [Host curto](#host-curto-do-qr-qrviewpetinfo). |
| `DEMO_TAG_ID` | — | Pet de exemplo dos botões da home. Ver [Home](#home-marketing). |
| `LEGAL_ENTITY_NAME`, `LEGAL_ENTITY_DOCUMENT`, `PRIVACY_CONTACT_EMAIL`, `PRIVACY_OFFICER_NAME` | — | Controlador dos dados na Política de Privacidade. Ver [Termos e LGPD](#termos-e-lgpd). |

As variáveis de S3 e R2 estão em [Armazenamento de imagens](#armazenamento-de-imagens).

## Formato do `hashId`

Opaco: não carrega nome, slug ou qualquer informação derivada do pet. Isso é proposital — o QR Code é impresso uma única vez e fica colado na plaquinha por anos. Trocar o nome do pet, o tutor, qualquer coisa, não pode invalidar a URL.

- **Comprimento:** 12 caracteres
- **Alfabeto (32 chars, URL-safe):** `23456789abcdefghjkmnpqrstuvwxyz` — sem `0`/`o`, `1`/`i`/`l`, que se confundem visualmente
- **Entropia:** 12 × 5 bits = **60 bits** (~10¹⁸ IDs possíveis)

Implementação em `src/lib/utils/ids.ts` (`generateHashId()`) e `src/lib/utils/id-format.ts` (`isHashId()`, sem dependências, usável no middleware).

## Estados de uma tag

`PetRepositoryFactory.getInstance().getPetEntry(hashId)` (`src/lib/repository/`) retorna uma discriminated union. `PetStatus` (`reserved | active | lost`) é o mesmo no domínio e no banco; `missing` é só "esse id nunca foi emitido".

| Estado     | Quando                                            | Comportamento da página                |
| ---------- | ------------------------------------------------- | -------------------------------------- |
| `missing`  | Nenhum registro para o hashId (ou status desconhecido no banco) | `notFound()` → `not-found.tsx` |
| `reserved` | Registro reservado, sem dados                     | Renderiza `PetForm`                    |
| `active`   | Pet cadastrado                                    | Renderiza o perfil público             |
| `lost`     | Pet cadastrado e marcado como perdido             | Perfil público com o banner de perdido |

Um status que o código não reconhece nunca é publicado: os providers respondem `missing`.

## Fluxo de reserva (QR Code estático)

O QR Code é impresso **antes** do tutor cadastrar o pet.

1. **Reserva** os IDs: `bun run reserve --count N` ou a página `/admin`. Cada ID entra no banco com status `reserved`.
2. **Imprime** o QR, um ID por plaquinha.
3. **Tutor escaneia**, a página detecta `reserved` e renderiza o `PetForm`.
4. **Submit** dispara a Server Action (`src/features/pet-registration/actions.ts`) que grava o pet como `active` e chama `revalidatePath`. A página recarrega com o perfil.

```bash
bun run reserve --count 100 > qr-batch.txt
# qr-batch.txt → 100 hashIds, um por linha
```

### URL do QR

O QR codifica, nesta ordem de preferência:

1. `${QR_BASE_URL}/<hashId>` — o host curto, quando `QR_BASE_URL` está definida;
2. `${SITE_URL}/tag/<hashId>`;
3. `<origem da requisição>/tag/<hashId>`.

`QR_BASE_URL` e `SITE_URL` precisam ser URLs http(s) absolutas, senão o `/admin` mostra o erro em vez da lista (e nenhum ID é reservado). Se só `QR_BASE_URL` estiver definida, o admin se recusa a gerar QR Codes, porque o redirect não teria pra onde ir. Em produção, defina as duas pra não imprimir etiquetas com o host errado.

### Página de admin (`/admin`)

Alternativa visual ao CLI: lista todos os IDs do banco com o status de cada um (`reserved` / `active` / `lost`), com filtro por status, e gera um novo ID (já reservado no banco) por vez.

- **Acesso:** HTTP Basic auth com a senha de `ADMIN_PASSWORD` (qualquer usuário).
- **QR Code:** renderizado no browser a partir do ID (não é guardado em lugar nenhum), então qualquer ID existente pode ter o QR visto e baixado de novo. Pontos circulares, finders em anéis concêntricos, logo ViewPet no centro (correção de erro nível H). Download em SVG.
- **Segurança:** Basic auth trafega a senha em texto claro, então sirva só via HTTPS. Não há rate limit na aplicação: use uma senha longa e limite tentativas no proxy/CDN.

### Host curto do QR (`qr.viewpet.info`)

O QR impresso não muda nunca, então ele aponta pra um host estável que só redireciona. Dá pra mover ou renomear a página real sem reimprimir nenhuma plaquinha.

```
https://qr.viewpet.info/<hashId>  ──307──▶  <SITE_URL>/tag/<hashId>
```

Exemplo de configuração: `QR_BASE_URL=https://qr.viewpet.info` (só a origem: sem caminho, query ou hash) e `SITE_URL=https://viewpet.info`.

- **Em runtime, sem rebuild:** o redirect é feito pelo `src/middleware.ts`, que lê as duas variáveis a cada requisição. Trocar o destino é só mudar a variável e reiniciar/redeployar. O admin lê as mesmas variáveis, então QR gerado e redirect nunca divergem.
- **Sem as variáveis** (ex.: dev local) não existe redirect e o QR aponta direto pra `<origem>/tag/<id>`.
- **DNS/hospedagem:** adicione `qr.viewpet.info` aos domínios do projeto e aponte o DNS pra mesma hospedagem do site. O DNS só faz o nome chegar até o app; quem redireciona é o middleware.
- **307, não 308:** o redirect é temporário de propósito, pra o destino poder mudar sem navegadores ou CDNs lembrarem do antigo.
- **Só ids válidos:** o middleware só redireciona caminhos de 12 caracteres que sejam um `hashId` bem formado; qualquer outra coisa segue pro 404 normal. O id é convertido pra minúsculas, então digitar em maiúsculas também funciona.
- **Barra final** (`/<id>/`): o Next primeiro normaliza pra `/<id>` (308) e depois vem o redirect, ou seja, uma volta a mais.
- **Sinal de scan (`qr_scan`):** um redirect não leva nada que a página consiga ler (o `Referer` é de onde o scan começou, nunca o host `qr.`). Por isso o redirect também seta o cookie `qr_scan=1`: 60 segundos, `HttpOnly`, `SameSite=Lax`, `Secure` quando o site é https, com `Path` restrito à própria tag (`/tag/<id>`). A página lê o cookie no servidor e expõe `data-scan-source="qr"` (ou `"direct"`) no `<main>`. É a base do futuro "receber a localização de quem escaneou um pet perdido"; a coleta em si (com consentimento) ainda não existe.
  - **Domínio em comum:** o cookie é gravado pelo host `qr.` e lido pelo site, então precisa de `Domain` no pai comum (`qr.viewpet.info` + `viewpet.info` → `viewpet.info`). Se os dois hosts não compartilham um domínio pai, o redirect funciona mas **sem** o cookie.
  - **Limites:** recarregar a página em até 60s ainda conta como scan, e o cookie não é assinado (qualquer um pode forjá-lo no próprio navegador). Serve como sinal, não como prova.
- **Isolamento no middleware:** o Next só permite um `middleware.ts`, então ele apenas despacha. O guard do `/admin` (`src/features/admin/guard.ts`) e o redirect do QR (`src/features/qr-redirect/handler.ts`) são módulos separados que nunca rodam na mesma requisição. O redirect nunca lança: se algo falhar, loga e deixa a requisição seguir normalmente; o guard falha fechado (500, nunca a página).
- **Onde o caminho `/tag` mora:** `src/lib/utils/routes.ts`. Quem monta ou revalida essa URL usa `tagPath(id)`.

## Pré-visualização de links (Open Graph)

Quando alguém cola `/tag/<id>` no WhatsApp, Telegram, iMessage ou Slack, o app de mensagem lê as tags do `<head>` e monta um cartão: foto grande, título e descrição. Elas vêm de `src/features/pet-profile/metadata.ts`.

| Tag | Valor |
|-----|-------|
| `og:title` / `twitter:title` | `{nome} · View Pet` |
| `og:description` | `Perfil de {nome}. Contate o tutor pelo link.` (ou em inglês, conforme o idioma) |
| `og:image` / `twitter:image` | a foto do pet, **reduzida** pelo otimizador de imagens do Next (`/_next/image?url=…&w=640&q=75`) |
| `twitter:card` | `summary_large_image` |

- **Foto pequena de propósito:** uploads podem ter vários MB e os apps de mensagem costumam descartar imagens grandes no preview (o número citado pro WhatsApp é ~300 KB; confirme num aparelho real). Um JPEG de 128 KB vira ~33 KB. Fotos enviadas como PNG continuam PNG (o otimizador só converte pra WebP quando o cliente aceita), então podem ficar maiores.
- **URL absoluta:** a imagem é um caminho relativo e o Open Graph exige URL absoluta, então a página define o `metadataBase` a partir de `SITE_URL`. Se ela não estiver definida (ou for inválida), usa a origem da própria requisição, que vem dos cabeçalhos `Host`/`X-Forwarded-Host` (hosts malformados são rejeitados, nunca derrubam a página). Esses cabeçalhos só valem o que o proxy na frente garante, então **defina `SITE_URL` em produção**.
- **Privacidade:** só o nome e a foto do pet aparecem. Nada do tutor (nome, telefone, e-mail). Tags desconhecidas ou só reservadas mostram um preview genérico (texto traduzido, sem dados de pet e sem imagem). Pet sem foto usa o cartão `summary`, sem imagem.
- **Proxy de imagens:** o otimizador do Next só busca hosts permitidos em `images.remotePatterns` (`next.config.ts`), que hoje inclui um curinga `**` sobre https; ou seja, `/_next/image` também funciona pra imagens de qualquer outro site. Restringir isso aos hosts de storage de verdade (S3/R2/CloudFront) é uma mudança à parte, porque afeta as outras imagens do app; ao fazê-la, mantenha os hosts de onde vêm as fotos dos pets, senão os previews quebram em silêncio.
- **`noindex` continua:** buscadores ficam de fora, mas os apps de mensagem ignoram essa regra, então os previews funcionam.
- **Cache:** os apps guardam o preview por muito tempo e por URL. Hoje a foto só é definida no cadastro, então não há o que invalidar; se um dia ela puder ser trocada, a URL da imagem precisa mudar junto (por exemplo com um `?m=<timestamp>`).
- **Ainda não existe:** imagem de marca gerada (`next/og`), preview específico de pet perdido e uma imagem estática de marca para o preview genérico.

## Schema de dados

### Tipos TypeScript (`src/types/pet.ts`)

```ts
type PhoneChannel = "call" | "whatsapp" | "telegram" | "sms";
type SocialPlatform = "instagram" | "facebook" | "x" | "tiktok";
type PetGender = "male" | "female";
type PetSpecies = "dog" | "cat";               // lista fechada (PET_SPECIES)

type PetStatus = "reserved" | "active" | "lost";
type RegisteredPetStatus = "active" | "lost";   // PetStatus sem "reserved"

interface Phone {
  e164:     string;         // digits-only E.164, sem "+" (ex.: "5548985596882")
  display?: string;         // como o tutor digitou (ex.: "(48) 98559-6882")
  channels: PhoneChannel[]; // qualquer combinação; o formulário oferece call, whatsapp e telegram
}

interface Guardian {
  name:   string;
  email?: string;           // o formulário exige o e-mail do tutor principal
  phones: Phone[];          // até 3 pelo formulário; o primeiro é o principal
  social: Partial<Record<SocialPlatform, string>>;
}

// O aceite dos termos no cadastro (ver "Termos e LGPD").
interface ConsentRecord {
  acceptedAt:     string;   // ISO-8601, quando o cadastro foi enviado com as duas caixas marcadas
  termsVersion:   string;   // YYYY-MM-DD da versão dos Termos de Uso exibida
  privacyVersion: string;   // YYYY-MM-DD da versão da Política de Privacidade exibida
}

// Um episódio de "pet sumiu". Aberto: endedAt === null. Resolvido: guarda o
// instante em que foi encontrado. Episódios passados ficam como histórico.
interface LostEvent {
  startedAt:         string;         // ISO-8601
  endedAt:           string | null;  // ISO-8601, ou null enquanto perdido
  lastSeenLocation?: string;
  lastSeenAt?:       string;         // ISO-8601
  alerts?:           string[];       // máx. 3 (validado em runtime)
}

interface Pet {
  name:       string;
  pictureUrl: string;
  birthdate:  string;              // ISO-8601
  status:     RegisteredPetStatus;
  gender?:    PetGender;
  species?:   PetSpecies;          // obrigatório no formulário; opcional aqui p/ pets antigos
  weightKg?:  number;              // kg, decimal (ex.: 4.5)
  neutered?:  boolean;             // tri-state: true, false ou ausente = "não informado"
  breed?:     string;              // texto livre; o formulário sugere raças enquanto digita
  allergies?: string[];            // texto livre, uma por item (com sugestões no formulário)
  about?:     string;              // parágrafo livre (até 500 caracteres)
  consent?:   ConsentRecord;       // ausente nos pets cadastrados antes dos termos
  lostEvent?: LostEvent;           // o evento ABERTO; só quando status === "lost"
  guardians:  Guardian[];          // ordem importa — [0] é o tutor principal
}

type PetEntry =
  | { status: "missing" }
  | { status: "reserved" }
  | { status: RegisteredPetStatus; pet: Pet };

type PetStore = Record<string, Pet | null>;   // formato do seed e do provider local
```

`guardians` é um array porque pet costuma ser de uma família. O índice `0` é o tutor principal (convenção, sem flag); a página pública dá destaque pra ele e lista os demais como contatos secundários. O formulário aceita no máximo 2 (`MAX_GUARDIANS`).

Cada tutor pode ter mais de um número, e o primeiro é o principal: a página pública o rotula "Celular principal" e o banner de pet perdido liga para o primeiro número que aceita chamadas. Cada número escolhe sozinho seus canais: ligação, WhatsApp, Telegram, ou qualquer combinação (o botão do Telegram abre `https://t.me/+<número>`, que só resolve se a pessoa permitir ser encontrada pelo número).

`Pet.lostEvent` expõe só o evento aberto, nunca um array. O histórico de eventos resolvidos fica no banco (ver Mongo abaixo).

### Providers de banco

Selecionados por `DATABASE_PROVIDER` (`src/lib/repository/factory.ts`). Os dois implementam a mesma interface (`getPetEntry`, `setPet`, `listPetEntries`, mais `reservePetId` e `listPetIds` pro seed/admin). Detalhes da camada em [`src/lib/repository/README.md`](src/lib/repository/README.md).

#### Local (filesystem)

Arquivo `data/local.db.json`. Formato flat — o mesmo de `src/data/pets.json`, o arquivo de seed:

```json
{
  "mvtkp7hs2xqe": null,
  "nuxw4d83wraa": {
    "name": "Lupe",
    "pictureUrl": "...",
    "birthdate": "2018-04-21T18:21:09.372Z",
    "gender": "male",
    "species": "dog",
    "weightKg": 24.5,
    "neutered": true,
    "breed": "Husky Siberiano",
    "allergies": ["Frango"],
    "about": "Muito brincalhão...",
    "status": "active",
    "guardians": [
      {
        "name": "David Corrêa Gaspar",
        "email": "david@example.com",
        "phones": [{ "e164": "5548984596882", "channels": ["call", "whatsapp"] }],
        "social": { "instagram": "davidgaspar.dev" }
      }
    ]
  }
}
```

- `null` → slot reservado (`reserved`)
- Objeto → `Pet` completo (`active` ou `lost`, conforme `status`). Um pet perdido leva o `lostEvent` embutido.

Sem separação por collection: o local é só pra dev e teste, então o JSON fica legível e o seed simétrico. A separação tutor/pet/evento é problema do Mongo.

#### MongoDB

Três collections (`src/lib/repository/mongodb/`; tipos em `dto.ts`). O pet aponta pros tutores via `guardianIds: ObjectId[]` (ordenado: índice 0 = principal), e os eventos de perda apontam pro pet via `petId`. Tutores são deduplicados por email: um casal com dois pets compartilha um único documento em `guardians`, então atualizar um telefone é um só write.

**`pets`**

| Campo         | Tipo                               | Notas                                                      |
| ------------- | ---------------------------------- | ---------------------------------------------------------- |
| `_id`         | `string`                           | O próprio `hashId` (12 chars). Chave primária natural.     |
| `status`      | `"reserved" \| "active" \| "lost"` | Discriminador. Mesmo `PetStatus` do domínio.               |
| `name`, `pictureUrl`, `birthdate` | `string`       | Ausentes quando `reserved`.                                |
| `gender`, `species`, `weightKg`, `neutered`, `breed`, `allergies`, `about` | opcionais | Ausentes quando não informados; `neutered: false` é gravado. |
| `consent`     | `ConsentRecord` (opcional)         | Só é escrito, nunca apagado por um `setPet` sem ele.       |
| `guardianIds` | `ObjectId[]`                       | Ordem encoda prioridade — `[0]` é o principal.             |
| `createdAt`, `updatedAt` | `Date`                  | Gerenciados pelo provider.                                 |

Os campos opcionais são substituídos por inteiro a cada `setPet`: salvar um pet sem um deles apaga o que uma gravação anterior deixou.

**`guardians`**

| Campo       | Tipo                                      | Notas                                                      |
| ----------- | ----------------------------------------- | ---------------------------------------------------------- |
| `_id`       | `ObjectId`                                |                                                            |
| `name`      | `string`                                  |                                                            |
| `email`     | `string` (opcional)                       | Índice único parcial (ignora ausentes); chave de dedup.    |
| `phones`    | `Phone[]`                                 |                                                            |
| `social`    | `Partial<Record<SocialPlatform, string>>` |                                                            |
| `createdAt`, `updatedAt` | `Date`                       |                                                            |

**`lost_events`**

| Campo              | Tipo                  | Notas                                                          |
| ------------------ | --------------------- | -------------------------------------------------------------- |
| `_id`              | `ObjectId`            |                                                                |
| `petId`            | `string`              | FK pra `pets._id`.                                             |
| `startedAt`        | `string` (ISO-8601)   | Quando o pet sumiu. Nunca sobrescrito em evento aberto.        |
| `endedAt`          | `string \| null`      | `null` = aberto. Preenchido quando o pet volta a `active`.     |
| `lastSeenLocation` | `string` (opcional)   |                                                                |
| `lastSeenAt`       | `string` (opcional)   | ISO-8601.                                                      |
| `alerts`           | `string[]` (opcional) | Máx. 3.                                                        |
| `createdAt`, `updatedAt` | `Date`          |                                                                |

A collection já se chamou `lostEvents`: na primeira conexão, um banco que ainda a tenha com o nome antigo a vê renomeada para `lost_events` (com documentos e índices).

`setPet` mantém o ciclo de vida: com `status: "lost"` abre (ou atualiza) o único evento aberto; com `status: "active"` fecha qualquer evento aberto (`endedAt = agora`), preservando o histórico.

**Índices** (criados automaticamente na primeira conexão):

```js
db.guardians.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
db.pets.createIndex({ guardianIds: 1 });          // "meus pets" no app nativo
db.pets.createIndex({ status: 1 });               // queries de perdidos
db.lost_events.createIndex({ petId: 1, endedAt: 1 });  // evento aberto / histórico do pet
db.lost_events.createIndex({ petId: 1 }, { unique: true, partialFilterExpression: { endedAt: null } });  // no máx. 1 evento aberto por pet
```

**Leitura da página pública** — um aggregate por hashId: `$lookup` dos tutores (a ordem é refeita a partir de `guardianIds`) e `$lookup` do evento aberto (`petId == _id` e `endedAt == null`):

```js
db.pets.aggregate([
  { $match: { _id: hashId } },
  { $lookup: { from: "guardians", localField: "guardianIds", foreignField: "_id", as: "guardians" } },
  { $lookup: { from: "lost_events", /* petId == _id && endedAt == null, $limit 1 */ as: "openLostEvents" } },
]);
```

**Providers recomendados:** [MongoDB Atlas](https://www.mongodb.com/atlas), [Railway](https://railway.app/).

## Home (marketing)

A página `/` apresenta o produto: hero, "como funciona", o que a página do pet mostra e a plaquinha. O texto fica em `src/features/home/content.ts` (tudo o que ele afirma tem que existir no app) e cada bloco é um componente em `src/features/home/components/`. A plaquinha e o celular das ilustrações são HTML/CSS e SVG, sem imagem nem cena 3D. A plaquinha mostra o verso do produto: aço escovado, de textura discreta (o componente `src/ui/BrushedMetal.tsx`: gradiente em tons de cinza próximos, uma só trama de linhas finas e um filtro `feTurbulence` esticado na horizontal), o furo para o fio acima do QR Code, o QR Code e, embaixo dele, um código de exemplo (`EXAMPLE_TAG_ID` em `content.ts`, com o formato de um id real mas sem pet), o mesmo código que vai no endereço da página do pet. O furo é vazado de verdade: uma máscara (`mask-image`) o recorta do aço, então o que está atrás da plaquinha aparece por ele, e a sombra é um `drop-shadow` que acompanha o recorte. O QR da ilustração abre `SITE_URL` (ou `https://viewpet.info`, se ela estiver vazia ou inválida) e é definido uma única vez na página, como um `<symbol>` (`HomeQrDefs`); cada plaquinha o desenha com um `<use>`. A home é gerada no build e de novo, no máximo, a cada hora: `SITE_URL` (QR e `canonical`) e `DEMO_TAG_ID` são lidas nessas duas ocasiões, e o ano do rodapé acompanha.

| Variável | Exemplo | Efeito |
|----------|---------|--------|
| `DEMO_TAG_ID` | `nuxw4d83wraa` | Id de um pet **publicado** (ativo ou perdido), usado nos botões "Ver uma página de exemplo". Sem ela, com um id malformado, inexistente, ainda só reservado (cuja página é o formulário público) ou se o banco não responder, esses botões somem e a home continua funcionando. Use um pet de exemplo dedicado, não o de um cliente: a página mostra os contatos dele a qualquer visitante. É lida quando a home é gerada (build e a cada hora), então o banco precisa estar acessível no build. |

## Termos e LGPD

O cadastro só publica a página se o tutor marcar **duas caixas** (nenhuma vem marcada): (1) "Li e aceito os Termos de Uso e estou ciente da Política de Privacidade" e (2) a autorização específica para publicar os dados informados, inclusive nome e telefones dos tutores, com a declaração de que as pessoas cujos contatos foram informados autorizaram. Os dois textos abrem em outra aba, para o formulário não perder o que já foi digitado.

- **Páginas:** `/terms` e `/privacy`, com o texto só em português (o cadastro em inglês avisa isso). O texto fica em `src/features/legal/terms.ts` e `privacy.ts`; os links estão no rodapé da home e da página do pet.
- **Validação no servidor:** `submitPet` recusa o envio sem as duas caixas (`consent_required`) antes de qualquer outra coisa, inclusive antes de salvar a foto. `required` no HTML é só conveniência.
- **Prova do aceite (LGPD art. 8º, §2º):** o pet guarda `consent` com a data e a hora e a versão de cada documento. Nada mais: sem IP nem user agent, que seriam mais dado pessoal só para provar o aceite. O MongoDB só escreve esse campo, nunca o apaga: salvar o pet sem ele (um script, o seed) não destrói a prova.
- **Versões:** `src/features/legal/versions.ts` tem a data de cada documento. Mude a versão no mesmo commit do texto. Pets já cadastrados mantêm a versão que aceitaram; quando uma mudança for relevante (finalidade, compartilhamento), é preciso avisar os tutores e pedir novo aceite (art. 8º, §6º). Esse fluxo de novo aceite ainda não existe.
- **Sem aceite registrado:** pets cadastrados antes dos termos não têm `consent`. Não há tela de edição, então eles continuam publicados sem esse registro até que o tutor seja contatado.

| Variável | Efeito |
|----------|--------|
| `LEGAL_ENTITY_NAME` | Razão social ou nome de quem controla os dados (LGPD art. 9º, III). |
| `LEGAL_ENTITY_DOCUMENT` | CNPJ (ou CPF) do controlador, no formato em que deve aparecer na política. |
| `PRIVACY_CONTACT_EMAIL` | Canal para o titular exercer os direitos do art. 18 (exigido mesmo por quem for dispensado de ter encarregado; Resolução CD/ANPD nº 2/2022, art. 11). |
| `PRIVACY_OFFICER_NAME` | Opcional: o encarregado, se houver um (art. 41). |

As páginas são geradas no build e de novo, no máximo, a cada hora. Sem as três primeiras variáveis o build avisa no log e, fora de produção, a página mostra um aviso; **em produção a política ficaria sem controlador e sem contato, o que não atende o art. 9º**. Preencha antes de publicar.

**Revisão jurídica:** os textos foram escritos a partir da LGPD (Lei 13.709/2018, arts. 5º a 9º, 14 a 19, 33, 41 e 46 a 48) e do que o app faz hoje, mas não passaram por advogado. Antes de ir para produção, confira com um: o prazo de 15 dias para eliminar os dados, os provedores e a transferência para fora do Brasil (art. 33), a base legal de cada finalidade, e se o ViewPet se enquadra como agente de pequeno porte. Todo texto que descreve o tratamento (`dados`, `publico`, `compartilhamento`, `cookies`) precisa ser conferido de novo sempre que o app passar a coletar ou a mostrar algo diferente, como analytics, edição do cadastro ou o modo pet perdido.

## URLs de exemplo

O seed (`src/data/pets.json`) tem sete pets, um deles perdido:

| HashId         | Estado   | Pet    |
| -------------- | -------- | ------ |
| `nuxw4d83wraa` | `active` | Lupe   |
| `n7k8w3zwe49w` | `active` | Mel    |
| `egqr8k6at59j` | `lost`   | Thor   |
| `ujvb9gd7afsx` | `active` | Bob    |
| `8p6qt38gj7be` | `active` | Luna   |
| `vcjv2sx3s5bd` | `active` | Scooby |
| `6pb46abtj58e` | `active` | Mel    |

- <http://localhost:3000/tag/nuxw4d83wraa> — perfil completo
- <http://localhost:3000/tag/egqr8k6at59j> — pet perdido
- <http://localhost:3000/tag/aaaaaaaaaaaa> — 404
- <http://localhost:3000/tmp> — só em dev (404 em produção): lista os ids do banco com o status de cada um
- <http://localhost:3000/admin> — admin (precisa de `ADMIN_PASSWORD`)

## Idioma

Resolução em três níveis:

1. `?lang=pt` ou `?lang=en` na query
2. Header `Accept-Language` do navegador, pela ordem de preferência (valores `q`; `pt_BR` com underscore também vale)
3. Fallback pra `pt-BR`

Só o header decide, de propósito: `navigator.languages` pode divergir dele (num Android, o servidor via português e uma checagem no navegador trocava a página para inglês logo após a primeira renderização), então não é consultado.

Exemplo: <http://localhost:3000/tag/nuxw4d83wraa?lang=en>

`src/lib/i18n.ts` carrega o dicionário (seguro em Client Components); `src/lib/i18n.server.ts` resolve o locale via `next/headers` (server-only).

## Estrutura de pastas

```
scripts/                          # CLIs: reserve, seed, qr-logo e testes manuais de storage
docs/                             # plano do modo "perdido", ADRs

src/
├── app/
│   ├── layout.tsx                # layout raiz + fontes + globals
│   ├── page.tsx                  # home de marketing
│   ├── admin/page.tsx            # /admin: lista de ids + gerador de QR
│   ├── terms/page.tsx            # Termos de Uso
│   ├── privacy/page.tsx          # Política de Privacidade
│   ├── tmp/page.tsx              # dev-only: lista de ids do banco
│   └── tag/[id]/
│       ├── page.tsx              # branch missing/reserved/active/lost
│       └── not-found.tsx         # 404
├── middleware.ts                 # despacha: guard do /admin e redirect do QR
├── features/                     # uma pasta por feature
│   ├── admin/                    # auth, guard, reserva, origem e estilo do QR, UI do gerador
│   ├── home/                     # blocos e texto da home de marketing
│   ├── legal/                    # texto e versões dos Termos e da Política, contato do controlador
│   ├── pet-profile/              # perfil público (PetHero, PetDetails, GuardianContact, LostBanner, ...) e metadata Open Graph
│   ├── pet-registration/         # PetForm, campos e Server Action de cadastro
│   ├── pet-tag/                  # cena 3D da tag (Three.js / R3F); sem rota usando hoje
│   └── qr-redirect/              # redirect do host curto + cookie qr_scan
├── ui/                           # primitives compartilhadas: Logo, Card, BrushedMetal, Tooltip, StickyHeader, Snackbar, icons
├── lib/
│   ├── repository/               # PetRepository: interface, factory, local, mongodb/
│   ├── storage/                  # StorageProvider: local, aws/s3, cloudflare/r2
│   ├── qrcode/                   # render do QR em SVG + logo
│   ├── utils/                    # ids, id-format, routes, origin, age, birthdate, phone, email, pet-details, qr-redirect, qr-scan, base-url
│   ├── blobs.ts                  # facade do storage (savePetImage)
│   ├── pet-suggestions.ts        # sugestões de raça e alergias do formulário
│   ├── i18n.ts                   # dicionário PT-BR / EN-US (client-safe)
│   └── i18n.server.ts            # resolveLocale (server-only)
├── data/pets.json                # dados de seed
└── types/pet.ts                  # Pet, Guardian, Phone, LostEvent, ConsentRecord, PetStatus, ...
```

## Armazenamento de imagens

Camada de abstração em `src/lib/storage/` (detalhes em [`src/lib/storage/README.md`](src/lib/storage/README.md)). O banco guarda só a URL da imagem.

| Provedor | Uso                    | URL das imagens                                              |
| -------- | ---------------------- | ------------------------------------------------------------ |
| `local`  | Desenvolvimento        | `/uploads/abc123.jpg` (gravado em `public/uploads/`)         |
| `s3`     | Produção               | `https://bucket.s3.region.amazonaws.com/uploads/abc123.jpg`  |
| `r2`     | Produção (zero egress) | `https://<seu-dominio-ou-pub-xyz.r2.dev>/uploads/abc123.jpg` |

```bash
STORAGE_PROVIDER=local   # padrão
STORAGE_PROVIDER=s3
STORAGE_PROVIDER=r2

# Quando STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net  # opcional
AWS_S3_PUBLIC_URL=https://cdn.example.com                # opcional
AWS_ENDPOINT=http://localhost:4566                       # opcional (LocalStack)

# Quando STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=viewpet-images-prod
R2_ACCESS_SUBDOMAIN=https://img.viewpet.com
```

## Mais documentação

- [`PATTERN.md`](PATTERN.md) — padrões de arquitetura (ports & adapters, barrel)
- [`docs/lost-mode-plan.md`](docs/lost-mode-plan.md) — direção do produto e do modo "perdido"
- [`docs/adrs/`](docs/adrs/) — decisões de arquitetura
