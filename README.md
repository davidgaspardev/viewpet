# View Pet

MVP de uma página web pública que renderiza as informações de um pet a partir de um `hashId` na URL:

```
https://<domain>/view/<hashId>
```

O `hashId` é a chave usada pra buscar o registro do pet no banco de dados. A página é o destino do QR Code impresso na plaquinha do pet — sem login, leitura pública, otimizada pra ser aberta por um estranho que encontrou o animal.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, React 19)
- [Bun.js](https://bun.sh/) (runtime + package manager + script runner)
- TypeScript + Tailwind CSS
- MongoDB (produção), filesystem JSON (dev/test)
- S3 (produção) ou filesystem (dev) pra armazenamento de imagens
- i18n próprio (PT-BR e EN-US)
- [nanoid](https://github.com/ai/nanoid) pra geração de hashIds opacos

## Rodando localmente

```bash
# 1. Dependências
bun install

# 2. (Opcional) Sobe MongoDB local — só precisa se for usar provider mongodb
docker-compose up -d mongodb

# 3. Popula dados de exemplo
bun run seed

# 4. Dev server
bun dev
```

App sobe em <http://localhost:3000>.

Por padrão o provider é `local` (arquivo `data/local.db.json`), então o passo 2 é opcional pra desenvolvimento. Pra usar MongoDB:

```bash
DATABASE_PROVIDER=mongodb bun dev
```

### Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `bun dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção |
| `bun start` | Servidor de produção |
| `bun run lint` | Lint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | Roda os testes |
| `bun run seed` | Popula o banco com `src/data/pets.json` |
| `bun run seed --reset` | Limpa e re-popula (apenas provider `local`) |
| `bun run reserve` | Reserva 1 hashId vazio |
| `bun run reserve --count N` | Reserva N hashIds vazios |

## Formato do `hashId`

Opaco: não carrega nome, slug ou qualquer informação derivada do pet. Isso é proposital — o QR Code é impresso uma única vez e fica colado na plaquinha por anos. Trocar o nome do pet, o tutor, qualquer coisa, não pode invalidar a URL.

- **Comprimento:** 12 caracteres
- **Alfabeto (32 chars, URL-safe e sem ambiguidade visual):** `23456789abcdefghjkmnpqrstuvwxyz` (sem `0/O`, `1/l/I`, sem vogais pra evitar palavras)
- **Entropia:** 12 × 5 bits = **60 bits** (~10¹⁸ IDs possíveis)

Implementação em `src/lib/utils/ids.ts` (`generateHashId()`, `isHashId()`).

## Fluxo de reserva (QR Code estático)

O QR Code é impresso **antes** do tutor cadastrar o pet.

1. **Reserva** um lote: `bun run reserve --count N`. Cada ID entra no banco com status `reserved`.
2. **Imprime** o QR apontando pra `https://<domain>/view/<hashId>`, um ID por plaquinha.
3. **Tutor acessa a URL**, a página detecta `empty` e renderiza o `PetForm`.
4. **Submit** dispara a Server Action que grava o perfil e chama `revalidatePath`. A página recarrega no estado `filled`.

Pipeline típico:

```bash
bun run reserve --count 100 > qr-batch.txt
# qr-batch.txt → 100 hashIds, um por linha, prontos pra virar QR Codes
```

## Estados do banco

`src/lib/kvs.ts` expõe `getPetEntry(hashId)` que retorna uma discriminated union:

| Estado    | Quando                                            | Comportamento da página         |
| --------- | ------------------------------------------------- | ------------------------------- |
| `missing` | Nenhum registro para o hashId                     | `notFound()` → `not-found.tsx`  |
| `empty`   | Registro reservado, sem dados                     | Renderiza `PetForm`             |
| `filled`  | Registro com `PetPublicProfile` completo          | Renderiza o perfil público      |

## Schema de dados

### Tipos TypeScript (`src/types/pet.ts`)

```ts
type PhoneChannel = "call" | "whatsapp" | "sms";
type PetStatus    = "active" | "lost";

interface Phone {
  e164:     string;         // digits-only E.164, sem "+" (ex.: "5548985596882")
  display?: string;         // como o tutor digitou (ex.: "(48) 98559-6882")
  channels: PhoneChannel[];
}

interface Guardian {
  name:   string;
  email?: string;
  phones: Phone[];
  social: Partial<Record<"instagram" | "facebook" | "x" | "tiktok", string>>;
}

interface LostInfo {
  since:             string;    // ISO-8601
  lastSeenLocation?: string;
  lastSeenAt?:       string;    // ISO-8601
  alerts?:           string[];  // máx. 3
}

interface PetPublicProfile {
  name:       string;
  pictureUrl: string;
  birthdate:  string;        // ISO-8601
  status:     PetStatus;
  lostInfo?:  LostInfo;      // só presente quando status === "lost"
  guardians:  Guardian[];    // ordem importa — [0] é o tutor principal
}
```

`guardians` é um array porque pet costuma ser de uma família. O índice `0` é o tutor principal (convenção — não tem flag); a página pública dá destaque pra ele e lista os demais como contatos secundários.

### Provedores

Selecione via `DATABASE_PROVIDER`:

```bash
DATABASE_PROVIDER=local    # padrão — arquivo data/local.db.json
DATABASE_PROVIDER=mongodb  # produção
```

---

#### Local (filesystem)

Arquivo: `data/local.db.json`. Formato flat — mesma estrutura do mock `src/data/pets.json`:

```json
{
  "abc123": null,
  "nuxw4d83wraa": {
    "name": "Lupe",
    "pictureUrl": "...",
    "birthdate": "2018-04-21T18:21:09.372Z",
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

- `null` → slot reservado (estado `empty`)
- Objeto → `PetPublicProfile` completo (estado `filled`)

Sem separação por collection — o local é só pra dev e teste, então deixa o JSON legível e o seed simétrico ao banco. A separação tutor/pet é problema do Mongo (ver abaixo).

---

#### MongoDB

Duas collections, referência por `ObjectId`. O Pet aponta pros guardiões via `guardianIds: ObjectId[]` (ordenado: índice 0 = principal). Tutores são deduplicados por email, então um casal com dois pets compartilha um único documento em `guardians` — atualizar telefone é um só write.

**`pets`**

| Campo         | Tipo                              | Notas                                                            |
| ------------- | --------------------------------- | ---------------------------------------------------------------- |
| `_id`         | `string`                          | O próprio `hashId` (12 chars). Chave primária natural.           |
| `status`      | `"reserved" \| "active" \| "lost"` | Discriminador. `reserved` mapeia pra estado `empty` no facade.   |
| `name`        | `string`                          | Ausente quando `status === "reserved"`.                          |
| `pictureUrl`  | `string`                          | Ausente quando `status === "reserved"`.                          |
| `birthdate`   | `string` (ISO-8601)               | Ausente quando `status === "reserved"`.                          |
| `guardianIds` | `ObjectId[]`                      | Ordem encoda prioridade — `[0]` é o principal.                   |
| `lostInfo`    | `LostInfo` (opcional)             | Só presente quando `status === "lost"`.                          |
| `createdAt`   | `Date`                            | Auto-gerenciado pelo provider.                                   |
| `updatedAt`   | `Date`                            | Auto-gerenciado pelo provider.                                   |

**`guardians`**

| Campo       | Tipo                              | Notas                                                              |
| ----------- | --------------------------------- | ------------------------------------------------------------------ |
| `_id`       | `ObjectId`                        |                                                                    |
| `name`      | `string`                          |                                                                    |
| `email`     | `string` (opcional)               | Unique index (`partialFilterExpression` p/ ignorar nulos).         |
| `phones`    | `Phone[]`                         |                                                                    |
| `social`    | `Partial<Record<SocialPlatform, string>>` |                                                            |
| `createdAt` | `Date`                            |                                                                    |
| `updatedAt` | `Date`                            |                                                                    |

**Índices** (criados automaticamente na primeira conexão):

```js
db.guardians.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
db.pets.createIndex({ guardianIds: 1 });   // "meus pets" no app nativo
db.pets.createIndex({ status: 1 });        // futuras queries de perdidos
```

**Leitura da página pública** — um `$lookup` por hashId, com a ordem dos guardiões preservada via `guardianIds`:

```js
db.pets.aggregate([
  { $match: { _id: hashId } },
  { $lookup: {
      from: "guardians",
      localField: "guardianIds",
      foreignField: "_id",
      as: "guardians",
  }},
]);
```

**Configuração:**

```bash
MONGODB_URI=mongodb://localhost:27017/viewpet
```

**Providers recomendados:** [MongoDB Atlas](https://www.mongodb.com/atlas), [Railway](https://railway.app/).

## URLs de exemplo

O seed (`src/data/pets.json`) inclui pets ativos e slots vazios:

| HashId         | Estado   | Pet   |
| -------------- | -------- | ----- |
| `nuxw4d83wraa` | `filled` | Lupe  |
| `n7k8w3zwe49w` | `filled` | Mel   |
| `egqr8k6at59j` | `filled` | Thor  |
| `vcjv2sx3s5bd` | `filled` | Scooby |
| `6pb46abtj58e` | `filled` | Mel   |

Exemplos:

- <http://localhost:3000/view/nuxw4d83wraa> (perfil completo)
- <http://localhost:3000/view/aaaaaaaaaaaa> (404)

## Idioma

Resolução em três níveis:

1. `?lang=pt` ou `?lang=en` na query
2. Header `Accept-Language` do navegador
3. Fallback pra `pt-BR`

Exemplo: <http://localhost:3000/view/nuxw4d83wraa?lang=en>

`src/lib/i18n.ts` carrega o dicionário (seguro em Client Components); `src/lib/i18n.server.ts` resolve o locale via `next/headers` (server-only).

## Estrutura de pastas

```
scripts/
├── reserve.ts                # CLI: bun run reserve [--count N]
└── seed.ts                   # CLI: bun run seed [--reset]

src/
├── app/
│   ├── layout.tsx                # layout raiz + fontes + globals
│   ├── page.tsx                  # landing
│   ├── globals.css               # tailwind base/components/utilities
│   ├── tmp/page.tsx              # dev-only: lista de hashIds do seed
│   └── view/[id]/
│       ├── page.tsx              # branch missing/empty/filled
│       ├── actions.ts            # Server Action do submit
│       ├── ImageUpload.tsx       # input de foto (com câmera)
│       ├── PetForm.tsx           # formulário pra estado empty
│       └── not-found.tsx         # fallback 404
├── features/
│   ├── pet-profile/components/   # PetHero, GuardianContact, SocialLinks, ActionButton, ImageUpload, PetForm
│   └── pet-tag/                  # carousel 3D da plaquinha (Three.js / R3F)
├── ui/                           # primitives compartilhadas: Logo, Card, Tooltip, StickyHeader, icons
├── lib/
│   ├── database/
│   │   ├── index.ts              # factory getDatabaseProvider()
│   │   ├── interface.ts          # IKVSProvider
│   │   ├── local.ts              # LocalKVSProvider (filesystem JSON)
│   │   └── mongodb.ts            # MongoDBKVSProvider (duas collections)
│   ├── storage/                  # LocalStorageProvider / S3StorageProvider
│   ├── utils/
│   │   ├── age.ts                # cálculo dinâmico de idade
│   │   └── ids.ts                # generateHashId, isHashId
│   ├── blobs.ts                  # facade do storage (S3 ou local)
│   ├── i18n.ts                   # dicionário PT-BR / EN-US (client-safe)
│   ├── i18n.server.ts            # resolveLocale (server-only)
│   └── kvs.ts                    # facade sobre getDatabaseProvider()
├── data/
│   └── pets.json                 # dados de seed
└── types/
    └── pet.ts                    # PetPublicProfile, Guardian, Phone, LostInfo, ...
```

## Armazenamento de imagens

Camada de abstração em `src/lib/storage/`:

| Provedor | Uso             | URL das imagens                                              |
| -------- | --------------- | ------------------------------------------------------------ |
| `local`  | Desenvolvimento | `/uploads/abc123.jpg` (gravado em `public/uploads/`)         |
| `s3`     | Produção        | `https://bucket.s3.region.amazonaws.com/uploads/abc123.jpg` |

```bash
STORAGE_PROVIDER=local   # padrão
STORAGE_PROVIDER=s3      # produção

# Quando STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net  # opcional
```
