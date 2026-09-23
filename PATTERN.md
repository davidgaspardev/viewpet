# Patterns

Referência rápida dos padrões de arquitetura usados no projeto — o que são, onde aparecem no código e quando usar cada um.

## Dependency Inversion (Ports & Adapters)

Código de alto nível depende de uma abstração (a "porta"), não de uma implementação concreta. A implementação real ("adapter") é plugada em runtime, geralmente escolhida por variável de ambiente.

**Onde aparece:**

| Porta | Arquivo | Adapters |
|---|---|---|
| `PetRepository` / `Seedable` | `src/lib/repository/interface.ts` | `local.ts` (JSON em disco), `mongodb.ts` (MongoDB) |
| `IStorageProvider` | `src/lib/storage/interface.ts` | `local.ts` (`public/uploads/`), `s3.ts` (AWS S3), `blob.ts` (Vercel Blob) |

**Anatomia do padrão nesses dois casos:**

```
consumidor (actions.ts, page.tsx, scripts/*)
        │
        ▼
   interface.ts   ◄──── implementa ────  local.ts
  (a "porta")                             mongodb.ts / s3.ts / blob.ts
        ▲
        │ escolhe qual instanciar (lê env var)
     index.ts   (factory + singleton)
```

`index.ts` lê `DATABASE_PROVIDER` / `STORAGE_PROVIDER`, instancia o adapter certo e guarda num singleton — isso é o **composition root** do módulo (ver seção abaixo sobre por que `index.ts` não é um barrel puro aqui).

**Quando usar:** quando existem (ou vão existir em breve) duas implementações reais e concorrentes de algo, motivadas por uma necessidade concreta — não "pode ser que precise trocar um dia". Os casos acima nasceram da necessidade real de rodar dev/teste sem MongoDB e sem AWS, e de suportar Vercel Blob em produção.

**Quando não usar:** para uma única implementação sem plano concreto de troca. Interface com um adapter só é indireção que não paga aluguel.

## Barrel pattern

Um `index.ts` que **só reexporta** o que está em outros arquivos da mesma pasta, sem lógica própria. Serve para achatar imports profundos:

```ts
// index.ts (barrel puro — sem lógica)
export * from "./Button";
export * from "./Input";
```

```ts
// em vez de
import { Button } from "@/components/Button/Button";
// vira
import { Button } from "@/components";
```

**Importante — não confundir com o `index.ts` de `repository/` e `storage/` deste projeto.** Esses dois arquivos **não são barrels puros**: além de reexportar tipos no final, contêm a lógica de seleção do provider (factory), o singleton e as funções públicas (`getPetEntry`, `setPet`, `getStorageProvider`, etc). Isso é um **composition root** — o entry point do "pacote" interno, no mesmo espírito do `main` de um `package.json` de uma lib npm, que também costuma ter lógica.

Se um dia essa lógica de seleção crescer (mais providers, config mais complexa) a ponto de `index.ts` ficar longo demais para servir como índice de leitura rápida, vale separar:

```
repository/
  interface.ts    → a porta
  factory.ts       → seleção de provider, singleton (a lógica que hoje está em index.ts)
  local.ts / mongodb.ts
  index.ts         → barrel puro: export { getPetEntry, setPet, ... } from "./factory"
```

**Contras conhecidos do barrel pattern** (avaliar antes de introduzir um novo):
- pode prejudicar tree-shaking em alguns bundlers/configs;
- facilita import cycles em projetos grandes (A reexporta B que reexporta A).

**Quando usar:** pasta com múltiplos módulos irmãos que a aplicação sempre importa junto (ex.: design system, ícones). **Quando não usar:** como neste projeto hoje — pastas pequenas (1-2 arquivos consumidos) não se beneficiam, e forçar barrel por convenção pode esconder que o arquivo na verdade faz um composition root.

## Checklist ao adicionar um novo padrão aqui

- [ ] O padrão resolve um problema concreto já existente no código, não uma necessidade hipotética.
- [ ] Existe pelo menos um exemplo real no repositório linkado (arquivo + linha).
- [ ] Ficou claro "quando usar" e "quando não usar" — todo padrão tem custo de indireção.
