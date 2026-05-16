# View Pet

MVP de uma página web dinâmica que renderiza as informações de um pet a partir de um `hashId` na URL:

```
https://<domain>/view/<hashId>
```

O `hashId` é a chave usada para buscar o registro do pet no **banco de dados**. A aplicação suporta múltiplos provedores via variável de ambiente `DATABASE_PROVIDER`.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, React 19)
- [Bun.js](https://bun.sh/) (runtime + package manager + script runner)
- TypeScript
- Tailwind CSS
- i18n próprio (PT-BR e EN)
- [nanoid](https://github.com/ai/nanoid) para geração de hashIds opacos

## Rodando localmente

### 1. Instalar dependências

```bash
bun install
```

### 2. Iniciar banco de dados

```bash
# MongoDB (recomendado para dev local)
docker run -d --name viewpet-mongo -p 27017:27017 mongo:7

# Redis
docker run -d --name viewpet-redis -p 6379:6379 redis:7-alpine

# Ou sem banco — provider local grava em data/local.db.json
DATABASE_PROVIDER=local bun dev
```

### 3. Popular banco de dados

```bash
bun run seed
```

### 4. Rodar aplicação

```bash
bun dev
```

App sobe em <http://localhost:3000>.

### Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `bun dev` | Inicia servidor de desenvolvimento |
| `bun run build` | Build de produção |
| `bun start` | Inicia servidor de produção |
| `bun run lint` | Lint do código |
| `bun run typecheck` | Checagem de tipos TypeScript |
| `bun test` | Roda todos os testes |
| `bun run seed` | Popula o banco com dados de `src/data/pets.json` |
| `bun run reserve` | Reserva 1 hashId vazio |
| `bun run reserve --count N` | Reserva N hashIds vazios |

## Formato do `hashId`

O `hashId` é **opaco**: não carrega nome, slug ou qualquer informação derivada do pet. Isso é proposital — o QR Code é impresso uma única vez e fica colado na coleira/plaquinha do pet por anos. Qualquer mudança de nome ou de tutor não pode invalidar a URL.

Especificação:

- **Comprimento:** 12 caracteres
- **Alfabeto (32 chars, URL-safe e sem ambiguidade visual):** `23456789abcdefghjkmnpqrstuvwxyz`
  - Sem `0/O`, `1/l/I`, e sem vogais (evita formar palavras indesejadas).
- **Entropia:** 12 × 5 bits = **60 bits** (~10¹⁸ IDs possíveis).

A geração e validação ficam em `src/lib/ids.ts` (`generateHashId()`, `isHashId()`).

## Fluxo de reserva (QR Code estático)

O QR Code é impresso **antes** do cliente preencher os dados do pet. O fluxo é:

1. **Reservar** um lote de hashIds com `bun run reserve --count N`. Cada ID é inserido com estado `empty` (sentinela: "chave existe, dados ainda não").
2. **Imprimir** o QR Code apontando para `https://<domain>/view/<hashId>` (um `hashId` por plaquinha).
3. **Cliente acessa a URL** e a página detecta o estado `empty` → renderiza o formulário (`PetForm`) para o cliente preencher pet + tutor + redes sociais.
4. **Submit** dispara um Server Action (`actions.ts`) que grava no banco via `setPet` e chama `revalidatePath`. A página recarrega já com o perfil completo.

Pipeline típico para gerar QR Codes a partir do reserve:

```bash
bun run reserve --count 100 > qr-batch.txt
# qr-batch.txt agora tem 100 hashIds, um por linha,
# prontos para virar URLs e serem renderizados em QR Codes.
```

## Estados do KVS

`src/lib/kvs.ts` expõe `getPetEntry(hashId)` que retorna uma **discriminated union** com três estados:

| Estado    | Quando                                     | Comportamento da página             |
| --------- | ------------------------------------------ | ----------------------------------- |
| `missing` | Nenhum registro encontrado para o hashId   | `notFound()` → `not-found.tsx`      |
| `empty`   | Registro reservado, sem dados de pet       | Renderiza `PetForm`                 |
| `filled`  | Registro com `PetPublicProfile` completo   | Renderiza o perfil público do pet   |

## Schema de dados

### Tipos TypeScript (`src/types/pet.ts`)

```ts
type PhoneChannel = "call" | "whatsapp" | "sms";
type PetStatus    = "active" | "lost";

interface Phone {
  e164:      string;           // digits-only E.164, sem "+" (ex.: "5548985596882")
  display?:  string;           // como o tutor digitou (ex.: "(48) 98559-6882")
  channels:  PhoneChannel[];   // canais disponíveis neste número
}

interface Guardian {
  name:   string;
  email?: string;
  phones: Phone[];
  social: Partial<Record<"instagram" | "facebook" | "x" | "tiktok", string>>;
}

interface PetPublicProfile {
  name:       string;
  pictureUrl: string;
  birthdate:  string;     // ISO-8601
  status:     PetStatus;
  lostInfo?:  LostInfo;  // só presente quando status === "lost"
  guardian:   Guardian;
}
```

### Provedores de banco de dados

Selecione o provedor via `DATABASE_PROVIDER`:

```bash
DATABASE_PROVIDER=local    # padrão — grava em data/local.db.json
DATABASE_PROVIDER=redis    # Redis (produção)
DATABASE_PROVIDER=mongodb  # MongoDB (produção)
```

---

### Local (filesystem)

Arquivo: `data/local.db.json`

```json
{
  "abc123":      null,
  "nuxw4d83wraa": { "name": "Lupe", "pictureUrl": "...", "status": "active", "guardian": { ... } }
}
```

- `null` → slot reservado (`empty`)
- Objeto → perfil completo (`filled`)

---

### Redis

**Padrão de chaves:** `pet:{hashId}`

| Valor da chave         | Estado   |
|------------------------|----------|
| Chave inexistente      | `missing`|
| `"null"` (string)      | `empty`  |
| JSON do `PetPublicProfile` | `filled` |

```bash
# Reservar slot
SET pet:abc123 "null"

# Salvar perfil completo
SET pet:nuxw4d83wraa '{"name":"Lupe","pictureUrl":"...","status":"active","guardian":{...}}'
```

**Configuração:**
```bash
REDIS_URL=redis://localhost:6379
```

**Providers recomendados:** [Upstash](https://upstash.com/), [Redis Cloud](https://redis.com/), [Railway](https://railway.app/)

---

### MongoDB

**Collection:** `pets`  
**Campo discriminador:** `status`

| Documento                                      | Estado   |
|------------------------------------------------|----------|
| Nenhum documento com `_id = hashId`            | `missing`|
| `{ _id: hashId, status: "reserved" }`          | `empty`  |
| `{ _id: hashId, status: "active", name, ... }` | `filled` |
| `{ _id: hashId, status: "lost", name, ... }`   | `filled` |

```js
// Slot reservado
{ _id: "abc123", status: "reserved" }

// Perfil ativo
{
  _id:        "nuxw4d83wraa",
  status:     "active",
  name:       "Lupe",
  pictureUrl: "https://...",
  birthdate:  "2018-04-21T18:21:09.372Z",
  guardian: {
    name:   "David Corrêa Gaspar",
    email:  "david@example.com",
    phones: [{ e164: "5548984596882", display: "(48) 984596882", channels: ["call", "whatsapp"] }],
    social: { instagram: "davidgaspar.dev" }
  }
}

// Perfil perdido (futuro)
{
  _id:      "nuxw4d83wraa",
  status:   "lost",
  ...
  lostInfo: { since: "2025-05-16T10:00:00.000Z", lastSeenLocation: "Praia da Joaquina" }
}
```

**Configuração:**
```bash
MONGODB_URI=mongodb://localhost:27017/viewpet
```

**Providers recomendados:** [MongoDB Atlas](https://www.mongodb.com/atlas), [Railway](https://railway.app/)

---

## URLs de exemplo

O seed (`src/data/pets.json`) inclui:

| HashId         | Estado   | Pet   |
| -------------- | -------- | ----- |
| `nuxw4d83wraa` | `filled` | Lupe  |
| `n7k8w3zwe49w` | `filled` | Mel   |
| `egqr8k6at59j` | `filled` | Thor  |
| `ujvb9gd7afsx` | `filled` | Bob   |
| `8p6qt38gj7be` | `filled` | Luna  |

Exemplos:

- <http://localhost:3000/view/nuxw4d83wraa> (perfil completo)
- <http://localhost:3000/view/aaaaaaaaaaaa> (404)

## Idioma

O idioma é resolvido na seguinte ordem:

1. Parâmetro de query `?lang=pt` ou `?lang=en`
2. Header `Accept-Language` do navegador
3. Fallback para `pt-BR`

Exemplo: <http://localhost:3000/view/nuxw4d83wraa?lang=en>

> O módulo de i18n é dividido em dois: `src/lib/i18n.ts` (dicionário puro, seguro em Client Components) e `src/lib/i18n.server.ts` (resolução de locale via `next/headers`, server-only).

## Estrutura de pastas

```
scripts/
├── reserve.ts            # CLI: bun run reserve [--count N]
└── seed.ts               # CLI: bun run seed

src/
├── app/
│   ├── layout.tsx            # layout raiz + fontes + globals
│   ├── page.tsx              # landing: carousel 3D + marketing
│   ├── globals.css           # tailwind base/components/utilities
│   └── view/
│       └── [id]/
│           ├── page.tsx          # branch missing/empty/filled
│           ├── PetForm.tsx       # formulário (Client) para estado empty
│           ├── actions.ts        # Server Action de submit
│           └── not-found.tsx     # fallback de hashId inexistente
├── components/
│   ├── ActionButton.tsx      # botão de ação circular (tel/email/whatsapp/social)
│   ├── GuardianContact.tsx   # card de contato do tutor
│   ├── Logo.tsx              # SVG inline (dog + cat)
│   ├── PetHero.tsx           # foto, logo, badge de idade e pílula do nome
│   ├── SocialLinks.tsx       # ícones das redes sociais
│   └── icons.tsx             # PhoneIcon, MailIcon, WhatsAppIcon
├── data/
│   └── pets.json             # dados de seed
├── features/
│   └── pet-tag/              # carousel 3D da plaquinha (Three.js / R3F)
├── lib/
│   ├── age.ts                # cálculo dinâmico de idade
│   ├── blobs.ts              # camada de abstração de storage de imagens
│   ├── database/
│   │   ├── index.ts          # factory getDatabaseProvider()
│   │   ├── interface.ts      # IKVSProvider
│   │   ├── local.ts          # LocalKVSProvider (filesystem JSON)
│   │   ├── mongodb.ts        # MongoDBKVSProvider
│   │   └── redis.ts          # RedisKVSProvider
│   ├── i18n.ts               # dicionário PT-BR / EN-US (client-safe)
│   ├── i18n.server.ts        # resolveLocale (server-only)
│   ├── ids.ts                # generateHashId, isHashId
│   ├── kvs.ts                # facade sobre getDatabaseProvider()
│   └── storage/              # LocalStorageProvider / S3StorageProvider
└── types/
    └── pet.ts                # PetPublicProfile, Guardian, Phone, LostInfo, …
```

## Armazenamento de Imagens

A aplicação usa uma **camada de abstração** para armazenamento de imagens:

| Provedor | Uso | URL das imagens |
|----------|-----|----------------|
| **Local** | Desenvolvimento | `/uploads/abc123.jpg` |
| **S3** | Produção | `https://bucket.s3.region.amazonaws.com/uploads/abc123.jpg` |

```bash
STORAGE_PROVIDER=local  # padrão — salva em public/uploads/
STORAGE_PROVIDER=s3     # Amazon S3

# S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net  # opcional
```
