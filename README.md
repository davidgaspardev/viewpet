# View Pet

MVP de uma página web dinâmica que renderiza as informações de um pet a partir de um `hashId` na URL:

```
https://<domain>/view/<hashId>
```

O `hashId` é a chave usada para buscar o registro do pet em um KVS (Key-Value Store). Nesta versão inicial, o KVS é simulado por um arquivo JSON em disco, lido e gravado em runtime.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, React 19)
- [Bun.js](https://bun.sh/) (runtime + package manager + script runner)
- TypeScript
- Tailwind CSS
- i18n próprio (PT-BR e EN)
- [nanoid](https://github.com/ai/nanoid) para geração de hashIds opacos

## Rodando localmente

```bash
bun install
bun dev
```

App sobe em <http://localhost:3000>.

Outros comandos:

```bash
bun run build               # build de produção
bun start                   # inicia servidor de produção
bun run typecheck           # checagem de tipos
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

## Trocando o mock por um KVS real

A interface fica isolada em `src/lib/kvs.ts`. Para plugar Redis (ou DynamoDB, Cloudflare KV, etc.), basta reimplementar as funções mantendo as assinaturas:

```ts
getPetEntry(hashId: string): Promise<PetEntry>
setPet(hashId: string, pet: Pet): Promise<void>
reservePetId(hashId: string): Promise<void>   // grava sentinela null
listPetEntries(): Promise<Array<{ id, status, pet? }>>
```

Mapeamento natural para Redis:

- `reservePetId(id)` → `SET pet:<id> ""` (ou `SET pet:<id> "__reserved__"`)
- `setPet(id, pet)` → `SET pet:<id> <JSON>`
- `getPetEntry(id)` → `GET pet:<id>` e classificar: `nil` → `missing`, valor sentinela → `empty`, JSON → `filled`.
