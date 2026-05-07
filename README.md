# View Pet

MVP de uma página web dinâmica que renderiza as informações de um pet a partir de um `hashId` na URL:

```
https://<domain>/view/<hashId>
```

O `hashId` é a chave usada para buscar o registro do pet em um **KVS (Key-Value Store)**. A aplicação utiliza **Redis** como store de produção.

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

### 2. Iniciar Redis

```bash
# Usando Docker Compose (recomendado)
docker-compose up -d

# Ou com Docker diretamente
docker run -d --name viewpet-redis -p 6379:6379 redis:7-alpine
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

> 📖 **Guia completo:** Veja [REDIS_SETUP.md](./REDIS_SETUP.md) para instruções detalhadas, troubleshooting e deployment em produção.

### Outros comandos

```bash
bun run build               # build de produção
bun start                   # inicia servidor de produção
bun run typecheck           # checagem de tipos
bun run seed                # popula Redis com dados de pets.json
bun run reserve             # reserva 1 hashId vazio no KVS
bun run reserve --count 50  # reserva 50 hashIds (alias: -n 50)
```

## Formato do `hashId`

O `hashId` é **opaco**: não carrega nome, slug ou qualquer informação derivada do pet. Isso é proposital — o QR Code é impresso uma única vez e fica colado na coleira/plaquinha do pet por anos. Qualquer mudança de nome ou de dono não pode invalidar a URL.

Especificação:

- **Comprimento:** 12 caracteres
- **Alfabeto (32 chars, URL-safe e sem ambiguidade visual):** `23456789abcdefghjkmnpqrstuvwxyz`
  - Sem `0/O`, `1/l/I`, e sem vogais (evita formar palavras indesejadas).
- **Entropia:** 12 × 5 bits = **60 bits** (~10¹⁸ IDs possíveis).

A geração e validação ficam em `src/lib/ids.ts` (`generateHashId()`, `isHashId()`).

> **PIN de proteção** está adiado para v2. A entropia atual é suficiente para inviabilizar enumeração; quando quisermos esconder dados de contato atrás de um segundo fator (ex.: PIN de 4 dígitos impresso no verso da plaquinha), revisitamos.

## Fluxo de reserva (QR Code estático)

O QR Code é impresso **antes** do cliente preencher os dados do pet. O fluxo é:

1. **Reservar** um lote de hashIds com `bun run reserve --count N`. Cada ID é inserido no KVS com valor `null` (sentinela: "chave existe, dados ainda não").
2. **Imprimir** o QR Code apontando para `https://<domain>/view/<hashId>` (um `hashId` por plaquinha).
3. **Cliente acessa a URL** e a página detecta o estado `empty` → renderiza o formulário (`PetForm`) para o cliente preencher pet + dono + redes sociais.
4. **Submit** dispara um Server Action (`actions.ts`) que grava no KVS via `setPet` e chama `revalidatePath`. A página recarrega já com o perfil completo.

Pipeline típico para gerar QR Codes a partir do reserve:

```bash
bun run reserve --count 100 > qr-batch.txt
# qr-batch.txt agora tem 100 hashIds, um por linha,
# prontos para virar URLs e serem renderizados em QR Codes.
```

## Estados do KVS

`src/lib/kvs.ts` expõe `getPetEntry(hashId)` que retorna uma **discriminated union** com três estados — espelha o padrão Redis (`null` como sentinela de "reservado mas vazio"):

| Estado    | Quando                                | Comportamento da página         |
| --------- | ------------------------------------- | ------------------------------- |
| `missing` | Chave não existe no JSON              | `notFound()` → `not-found.tsx`  |
| `empty`   | Chave existe com valor `null`         | Renderiza `PetForm`             |
| `filled`  | Chave existe com objeto `Pet` válido  | Renderiza o perfil completo     |

## URLs de exemplo

O mock (`src/data/pets.json`) inclui:

| HashId         | Estado   | Pet  | Redes sociais |
| -------------- | -------- | ---- | ------------- |
| `nuxw4d83wraa` | `filled` | Lupe | 4 (full)      |
| `n7k8w3zwe49w` | `filled` | Mel  | 3             |
| `egqr8k6at59j` | `filled` | Thor | 2             |
| `ujvb9gd7afsx` | `filled` | Bob  | 1             |
| `8p6qt38gj7be` | `filled` | Luna | 0             |
| `vcjv2sx3s5bd` | `empty`  | —    | —             |
| `6pb46abtj58e` | `empty`  | —    | —             |

Exemplos:

- <http://localhost:3000/view/nuxw4d83wraa> (perfil completo)
- <http://localhost:3000/view/vcjv2sx3s5bd> (formulário vazio)
- <http://localhost:3000/view/aaaaaaaaaaaa> (404)

A página inicial (`/`) lista todos os IDs do mock com seus estados.

## Idioma

O idioma é resolvido na seguinte ordem:

1. Parâmetro de query `?lang=pt` ou `?lang=en`
2. Header `Accept-Language` do navegador
3. Fallback para `pt`

Exemplo: <http://localhost:3000/view/nuxw4d83wraa?lang=en>

> O módulo de i18n é dividido em dois: `src/lib/i18n.ts` (dicionário puro, seguro em Client Components) e `src/lib/i18n.server.ts` (resolução de locale via `next/headers`, server-only).

## Estrutura de pastas

```
scripts/
└── reserve.ts                # CLI: bun run reserve [--count N]

src/
├── app/
│   ├── layout.tsx            # layout raiz + fontes + globals
│   ├── page.tsx              # landing: lista IDs do mock
│   ├── globals.css           # tailwind base/components/utilities
│   └── view/
│       └── [id]/
│           ├── page.tsx      # branch missing/empty/filled
│           ├── PetForm.tsx   # form (Client) p/ estado empty
│           ├── actions.ts    # Server Action de submit
│           └── not-found.tsx # fallback de hashId inexistente
├── components/
│   ├── Logo.tsx              # SVG inline (dog + cat)
│   ├── OwnerContact.tsx      # card de contato do dono
│   ├── PetHero.tsx           # foto, logo, badge de idade e pílula do nome
│   └── SocialLinks.tsx       # ícones das redes sociais (opcionais)
├── data/
│   └── pets.json             # mock do KVS (lido/gravado em runtime)
├── lib/
│   ├── age.ts                # cálculo dinâmico de idade
│   ├── i18n.ts               # dicionário PT/EN puro
│   ├── i18n.server.ts        # resolveLocale (server-only)
│   ├── ids.ts                # generateHashId, isHashId
│   └── kvs.ts                # camada de acesso ao KVS (mock)
└── types/
    └── pet.ts                # Pet, Owner, PetStore, PetEntry
```

## Redis como KVS

A aplicação utiliza **Redis** como Key-Value Store. A interface fica isolada em `src/lib/kvs.ts`:

```ts
getPetEntry(hashId: string): Promise<PetEntry>
setPet(hashId: string, pet: Pet): Promise<void>
reservePetId(hashId: string): Promise<void>   // grava sentinela "null"
listPetEntries(): Promise<Array<{ id, status, pet? }>>
```

### Estrutura de dados no Redis

**Padrão de chaves:** `pet:{hashId}`

**Valores:**
- `"null"` (string) → Pet reservado mas vazio (mostra formulário)
- JSON stringificado → Pet com dados completos (mostra perfil)
- Chave inexistente → 404

**Exemplos:**
```bash
# Reservar pet vazio
SET pet:abc123 "null"

# Salvar pet completo
SET pet:nuxw4d83wraa '{"name":"Lupe","picture":"...","birthdate":"...","owner":{...}}'

# Listar todos os pets
KEYS pet:*
```

### Seed inicial

O comando `bun run seed` lê todos os pets de `src/data/pets.json` e os importa para o Redis:

```bash
bun run seed
# 🐾 Seeded: nuxw4d83wraa - Lupe
# 🐾 Seeded: n7k8w3zwe49w - Mel
# ...
# ✅ Seeding complete!
```

### Configuração

Por padrão, conecta em `redis://localhost:6379`. Para customizar:

```bash
# .env.local
REDIS_URL=redis://localhost:6379

# Ou para produção (com senha)
REDIS_URL=redis://:password@your-host:6379

# Com TLS
REDIS_URL=rediss://username:password@your-host:6379
```

**Providers recomendados para produção:**
- [Upstash](https://upstash.com/) (Serverless Redis)
- [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
- [Railway](https://railway.app/)
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)

> 📖 **Documentação completa:** [REDIS_SETUP.md](./REDIS_SETUP.md)

## Armazenamento de Imagens

A aplicação utiliza uma **camada de abstração** para armazenamento de imagens, permitindo trocar facilmente entre diferentes provedores:

### Provedores disponíveis

| Provedor | Uso | URL das imagens |
|----------|-----|----------------|
| **Local** | Desenvolvimento | `/uploads/abc123.jpg` |
| **S3** | Produção (recomendado) | `https://bucket.s3.region.amazonaws.com/uploads/abc123.jpg` |
| **Firebase** | Produção (alternativa) | `https://storage.googleapis.com/.../uploads/abc123.jpg` |

### Configuração

#### Desenvolvimento (Local - padrão)
```bash
# Nenhuma configuração necessária
# Imagens são salvas em public/uploads/
bun dev
```

#### Produção (S3 - recomendado)
```bash
# .env.local
AWS_REGION=us-east-1
AWS_S3_BUCKET=viewpet-images-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Opcional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=https://d123456789.cloudfront.net
```

> 📖 **Setup completo do S3:** [S3_SETUP.md](./S3_SETUP.md)

#### Produção (Firebase - alternativa)
```bash
# .env.local
FIREBASE_STORAGE_BUCKET=your-app.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### Seleção automática

Em produção (`NODE_ENV=production`), o sistema detecta automaticamente qual provedor usar:

1. **S3** (se `AWS_S3_BUCKET` e `AWS_ACCESS_KEY_ID` estiverem configurados)
2. **Firebase** (se `FIREBASE_STORAGE_BUCKET` estiver configurado)
3. **Local** (fallback - não recomendado para produção)

Para forçar um provedor específico:
```bash
STORAGE_PROVIDER=s3  # ou "firebase" ou "local"
```

> 📖 **Documentação completa:**
> - [S3_SETUP.md](./S3_SETUP.md) - Guia completo de setup AWS S3
> - [STORAGE_ARCHITECTURE.md](./STORAGE_ARCHITECTURE.md) - Arquitetura e princípios SOLID
> - [STORAGE_QUICK_REFERENCE.md](./STORAGE_QUICK_REFERENCE.md) - Referência rápida
