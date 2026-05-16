# View Pet — Evolução do produto e modo "Pet perdido"

> Documento de direção. Foco: clarear o que o View Pet é, o que ele NÃO é, e como adicionar o modo "perdido" sem inflar a ideia.

## 1. O que o View Pet é (em uma linha)

> Uma plaquinha física com QR Code que leva a uma página pública pra qualquer pessoa contatar o tutor — e, quando o pet sume, vira um "cartaz de procura digital" ao vivo.

Três coisas, nessa ordem de importância:

1. **Identificação imediata.** O estranho que achou o pet escaneia o QR e vê a foto, o nome e o telefone do tutor. Resolve 90% dos casos sem nada além disso.
2. **Cartaz de procura ativo.** Quando o tutor marca como perdido pelo app, a mesma URL muda de cara: vira urgente, mostra última localização vista, alertas de saúde e captura a localização de quem escaneou.
3. **Memória do pet.** No futuro: histórico de vacinas, contatos de veterinário, dieta. Hoje, fora de escopo.

## 2. Princípios que mantêm simples

- **URL nunca muda.** O `hashId` é impresso uma vez na plaquinha. Trocar o nome do pet, o dono, o número de telefone — nada disso pode invalidar a URL. Já está garantido pela arquitetura atual.
- **A página pública não tem login.** Quem escaneou é um estranho assustado segurando um pet desconhecido. Nada de cadastro, nada de captcha, nada de modal. Telefone clicável e pronto.
- **O dono gerencia em outro lugar.** Toda edição (incluindo marcar como perdido) acontece no app nativo. A web é só pra ver.
- **Nada de chat interno, nada de fórum, nada de feed.** Se o produto começar a virar rede social, a gente perdeu.

## 3. Arquitetura proposta

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│  Página pública (Next.js)   │         │  App nativo (iOS / Android) │
│  /view/<hashId>             │         │  Tutor logado               │
│                             │         │                             │
│  - SSR, sem login           │         │  - Login (email + OTP)      │
│  - 3 estados: missing /     │ ◄─────► │  - Lista de pets do tutor   │
│    empty / filled           │         │  - Edita perfil             │
│  - 4º estado: lost          │         │  - Toggle "marcar perdido"  │
│                             │         │  - Recebe push de scans     │
└─────────────┬───────────────┘         └─────────────┬───────────────┘
              │                                       │
              └───────────────┬───────────────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  API + Redis (já tem)  │
                  │  + Sightings store     │
                  │  + Push notifications  │
                  └────────────────────────┘
```

A web e o app falam com a mesma API. O Redis atual já serve — só precisa ganhar um par de chaves a mais.

## 4. Modelo de dados (alterações mínimas)

Adicionar dois campos opcionais ao `Pet` e uma nova entidade `Sighting`:

```ts
// src/types/pet.ts

export type PetStatus = "active" | "lost";

export interface LostInfo {
  /** ISO datetime de quando o tutor marcou como perdido */
  since: string;
  /** Texto livre curto: "Praia da Joaquina, perto do mercado" */
  lastSeenLocation?: string;
  /** ISO datetime de quando o tutor avistou o pet pela última vez */
  lastSeenAt?: string;
  /** Lista curta de alertas de saúde/comportamento */
  alerts?: string[];
}

export interface Pet {
  name: string;
  picture: string;
  birthdate: string;
  owner: Owner;
  status?: PetStatus;     // default "active"
  lostInfo?: LostInfo;    // só existe quando status === "lost"
}

/** Registro do que acontece quando alguém escaneia um pet perdido */
export interface Sighting {
  petId: string;        // hashId
  timestamp: string;    // ISO
  location?: { lat: number; lng: number; accuracy: number };
  // sem nome, sem telefone do achador — mantém zero atrito
}
```

Por que tão pouco: cada campo a mais é uma decisão a tomar e uma tela a desenhar. Recompensa, foto extra, redes sociais do tutor pro perdido — deixa pra v2.

## 5. A tela do pet perdido (espec)

Mockup visual está no arquivo irmão `lost-mode-mockup.html` (abra no navegador). Espec abaixo:

### Hero

- Mesma estrutura visual do estado `filled`: foto + chip do logo + pílula do nome.
- **Diferenças no modo perdido:**
  - Pílula do canto superior direito vira vermelha: `Perdido` + ícone de alerta. Substitui a pílula de idade.
  - Barra vermelha de 3px na borda inferior da foto, marcando que algo é diferente.

### Banner de contexto

Logo abaixo do hero, centralizado:

> Encontrou a Lupe?
> Husky · 8 anos · ajude ela a voltar pra casa

Curto, calmo, com a raça e idade pra dar identificação visual rápida (a foto pode estar desatualizada, a raça não).

### Card de última localização vista

Card vermelho-claro (`#FCEBEB`) com ícone de pin:

> **Visto pela última vez**
> 14/05 às 18h · Praia da Joaquina

Só aparece se `lostInfo.lastSeenLocation` estiver preenchido. Se não, omite — não polui com placeholder.

### CTA primária — Ligar agora

Botão grande, vermelho cheio, ocupando 100% da largura:

> 📞 Ligar agora pro tutor

`<a href="tel:+5548985596882">` — um toque chama. É o caminho mais curto e o mais usado em momentos de stress.

### CTA secundária — Compartilhar localização

Botão outline, mesma largura:

> 📍 Compartilhar minha localização

Ao tocar:

1. `navigator.geolocation.getCurrentPosition()` pede permissão.
2. POST `/api/sightings` com `{ petId, location, timestamp }`.
3. Backend dispara push notification pro app do tutor: "Alguém viu a Lupe perto de [endereço reverse-geocoded]".
4. Tela mostra "Localização compartilhada ✓" e some o botão.

**Importante:** sem cadastro do achador. Nada de nome, telefone, foto. Permissão de localização é o único atrito, e mesmo isso é opcional — quem não compartilha ainda viu o telefone.

### Alertas

Lista enxuta de 1–3 itens, cada um com ícone Tabler diferente:

- ❤️ Toma remédio pra coração todo dia
- 🔊 Tem medo de barulho alto
- 😊 Atende pelo nome, é dócil

Esses alertas são editáveis no app pelo tutor. Maximum 3 — mais que isso ninguém lê.

### Footer

Logo pequeno, semi-transparente. Sem CTA de "baixe nosso app". Nesse momento, o achador não é o público-alvo de aquisição.

## 6. Fluxo do tutor (no app)

```
1. Abre app → vê seus pets
2. Toca em "Lupe"
3. Botão "Marcar como perdido"
4. Modal: preencher última localização vista + horário (opcional)
5. Confirma
6. App mostra:
   - Status "perdido desde 14/05 18h"
   - Histórico de scans (lista de Sightings com mapa)
   - Push automático quando alguém vê
7. Quando reencontrado: "Marcar como encontrado"
```

A página pública atualiza em segundos (já temos `revalidatePath`).

## 7. Notificação ao tutor

Quando alguém escaneia um pet perdido, o tutor precisa saber em segundos. Três caminhos, do mais simples ao mais elaborado:

| Canal | Custo | Esforço | Recomendado pra v1 |
|-------|-------|---------|---------------------|
| Email | grátis | baixo | Sim — começa por aqui |
| Push do app | grátis | médio (precisa do app) | Sim, junto |
| SMS / WhatsApp | $$ | médio | v2 |

Recomendo email + push do app já no MVP do modo perdido. SMS é caro e a maioria dos donos vai estar com o app aberto / com notificação ligada.

## 8. Roadmap simples

**v1 — modo perdido básico (2–3 sprints)**

- [ ] Adicionar campos `status` e `lostInfo` ao tipo Pet
- [ ] Renderizar a página pública no modo perdido (tela mockada acima)
- [ ] Endpoint POST `/api/sightings` que aceita localização anônima
- [ ] Email para o tutor a cada sighting
- [ ] App nativo MVP: login por email OTP, lista de pets, toggle perdido, lista de sightings

**v2 — refinamentos**

- [ ] Push notification no app
- [ ] Mapa com pinos das sightings
- [ ] Reverse geocoding ("perto de Av. Beira-Mar")
- [ ] Recompensa opcional
- [ ] Foto extra "última foto antes de sumir"

**v3 — coisa mais ambiciosa, só se houver demanda real**

- [ ] Rede de scans próximos: notificar tutores de pets perdidos quando alguém scaneia perto
- [ ] Histórico de saúde / vacinas
- [ ] Veterinário compartilhado entre tutores

## 9. O que NÃO fazer agora (intencional)

- **Não criar conta na web.** A web é read-only pra estranho. Tutor mexe pelo app.
- **Não fazer chat in-app entre tutor e achador.** Telefone resolve. Chat adiciona um round-trip e nunca é tão rápido quanto uma ligação.
- **Não pedir cadastro do achador.** Zero atrito. O preço de captar nome/telefone é altíssimo num momento de stress.
- **Não adicionar feed, comunidade, posts.** View Pet não é rede social.
- **Não mostrar mapa com todas as sightings na página pública.** Isso é informação pro tutor, no app. Na web pública só o "último visto".
- **Não permitir múltiplas fotos no perfil ainda.** Uma foto bem feita > três fotos médias. Foco.
- **Não construir admin web pra tutor.** O app cobre. Manter duas frentes de UI gerencial é caro pra um MVP.

## 10. Decisões que ficam em aberto pra você

1. **Stack do app nativo:** React Native (reusa TypeScript / lógica), Flutter, ou nativo puro? Pra reaproveitar o time e a `lib/` atual, RN tende a ganhar.
2. **Onde mora a API:** continua no monorepo Next.js (route handlers) ou separa em serviço? Pra esse volume, monorepo basta.
3. **Login do app:** OTP por email ou Sign in with Apple/Google? OTP por email é o mais simples e não amarra em store policies.
4. **Onde armazenar sightings:** continua no Redis (chave `sightings:{petId}` com lista) ou migra pra Postgres? Pro MVP, Redis serve; quando precisar de queries geográficas, migra.

---

## TL;DR

- Mantém a página pública SSR, sem login, com 4 estados agora: `missing` / `empty` / `filled` / `lost`.
- Adiciona dois campos opcionais no `Pet` (`status`, `lostInfo`).
- No modo perdido: hero com badge vermelho, botão gigante de ligar, botão de compartilhar localização anônima. Sem cadastro pra ninguém.
- Tutor gerencia no app nativo. App recebe email + push a cada scan.
- Nada de chat, feed, conta web, ou múltiplas fotos. Foco no que importa: reunir pet com tutor o mais rápido possível.
