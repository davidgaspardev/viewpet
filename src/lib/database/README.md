# Database layer — provider abstraction

Camada de persistência de pets e tutores. Toda a aplicação fala com a interface `IPetRepository`; o backend real (MongoDB ou filesystem) é trocado por variável de ambiente.

## Estrutura

```
src/lib/database/
├── interface.ts   # IPetRepository (produção) + ISeedable (scripts/admin)
├── local.ts       # LocalRepository (filesystem JSON)
├── mongodb.ts     # MongoDBRepository (duas collections)
└── index.ts       # factory + singleton + exports diretos
```

## Provider selection

```bash
DATABASE_PROVIDER=local    # padrão — data/local.db.json
DATABASE_PROVIDER=mongodb  # produção — exige MONGODB_URI
```

## API

`src/lib/database/index.ts` exporta as funções usadas pela aplicação:

```ts
getPetEntry(hashId): Promise<PetEntry>     // PetEntry = missing | empty | filled
setPet(hashId, pet): Promise<void>
listPetEntries(): Promise<Array<{ id, status, name? }>>

// scripts/admin only (ISeedable):
reservePetId(hashId): Promise<void>
listPetIds(): Promise<string[]>
```

Os três estados:

| Estado    | Quando                                            |
| --------- | ------------------------------------------------- |
| `missing` | Nenhum registro pro hashId                        |
| `empty`   | Registro reservado sem dados de pet               |
| `filled`  | Registro com `PetPublicProfile` completo          |

## Modelo de dados

Cada provider modela os dados de um jeito diferente, otimizado pro seu caso de uso:

### LocalRepository

Flat. Um único JSON em `data/local.db.json`, mesma estrutura do mock `src/data/pets.json`:

```json
{
  "<hashId>": null,                    // slot reservado
  "<hashId>": <PetPublicProfile>       // perfil completo (guardians embedados)
}
```

Sem split de collection, sem dedup de tutores. É só dev/teste — manter o arquivo legível e fácil de editar à mão é mais importante que reproduzir a normalização do banco real.

### MongoDBRepository

Duas collections. Pets referenciam tutores via `guardianIds: ObjectId[]` (ordem importa — índice 0 é o principal). Tutores com email são deduplicados, então um casal com dois pets compartilha um único documento — atualizar o telefone é um único write que reflete em todos os pets.

Duas collections (`pets` e `guardians`) com índices criados sob demanda na primeira conexão:

```js
db.guardians.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
db.pets.createIndex({ guardianIds: 1 });
db.pets.createIndex({ status: 1 });
```

Leitura de `/view/<hashId>` é uma agregação com `$lookup` — uma round-trip pro banco:

```js
db.pets.aggregate([
  { $match: { _id: hashId } },
  { $lookup: { from: "guardians", localField: "guardianIds", foreignField: "_id", as: "guardians" } },
]);
```

A ordem de `guardianIds` é preservada após o lookup (o provider reordena com base no array original).

#### Write de pet (`setPet`)

1. Lê os `guardianIds` antigos do pet (se existir) para identificar órfãos.
2. Pra cada `Guardian` em `pet.guardians`:
   - Tem email? `findOneAndUpdate({ email }, ..., { upsert: true })` — dedup por email.
   - Sem email? `insertOne` — sempre cria um novo.
3. Deleta guardian docs sem email que não estão mais referenciados pelo pet.
4. `updateOne({ _id: hashId }, { $set: { ..., guardianIds }, $setOnInsert: { createdAt } }, { upsert: true })`.

Sem transação: se o write do pet falhar depois dos guardiões serem upsertados, guardiões com email são idempotentes na próxima tentativa. Guardiões sem email serão limpos na próxima chamada bem-sucedida de `setPet`. Envolva em sessão/transaction se um replica set estiver disponível.

## Configuração

### Local (zero setup)

Nada a fazer. `bun dev` já roda — o provider `local` grava em `data/local.db.json`.

### MongoDB

```bash
# Sobe o container
docker-compose up -d mongodb

# .env.local
DATABASE_PROVIDER=mongodb
MONGODB_URI=mongodb://localhost:27017/viewpet

# Popula
bun run seed
```

Pra produção (Atlas, Railway, etc.):

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/viewpet
```

## Testes

Os testes usam `LocalRepository` com um arquivo isolado (`data/test.db.json`) — sem Mongo, sem Docker.

```bash
bun test src/lib/__tests__/database.test.ts
```

Pra testar o provider Mongo especificamente existe `mongodb.test.ts` que sobe um `mongodb-memory-server` em memória — não exige container externo.

## Adicionando um novo provider

1. Cria `src/lib/database/<nome>.ts` com uma classe que implementa `IPetRepository` (ou `ISeedable` se precisar de reserva/listagem).
2. Adiciona o case no factory de `index.ts`.
3. Estende `DatabaseProviderType`.
4. Documenta o novo `DATABASE_PROVIDER=<nome>` no README raiz.
