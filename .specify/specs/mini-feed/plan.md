# Plan — Ivory Mini Feed (React Native + Backend)

## Arquitetura Técnica

```
ivory-process-seletive/
├── .specify/                       # Artefatos SPEC-DRIVEN
│   ├── memory/constitution.md
│   └── specs/mini-feed/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
├── backend/
│   ├── src/
│   │   ├── app.ts                  # createApp(): Express + middlewares + rotas
│   │   ├── server.ts               # Entry point (porta 3000)
│   │   ├── types.ts                # Tipos de domínio e DTOs
│   │   ├── store.ts                # Store em memória + seed determinístico
│   │   ├── middleware/
│   │   │   └── auth.ts             # requireAuth / optionalAuth (Bearer mock)
│   │   └── routes/
│   │       ├── auth.ts             # POST /v1/auth/login
│   │       ├── feed.ts             # GET /v1/feed (cursor pagination)
│   │       └── posts.ts            # like/unlike + comments
│   ├── tests/
│   │   └── api.test.ts             # Vitest + Supertest (≥ 5 testes)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── mobile/
│   ├── App.tsx                     # AuthProvider + switch Login/Feed
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── api/
│       │   ├── config.ts           # API_BASE_URL (10.0.2.2 / localhost / IP)
│       │   └── client.ts           # fetch tipado + ApiError
│       ├── context/
│       │   └── AuthContext.tsx     # token + user em AsyncStorage
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   └── FeedScreen.tsx      # FlatList + load more + refresh
│       ├── components/
│       │   ├── PostCard.tsx        # post + botão like (pending/optimistic)
│       │   └── CommentsModal.tsx   # lista + criação de comentários
│       └── types.ts                # Tipos compartilhados da API
└── README.md
```

## Backend

### Camadas
- **Store (`store.ts`)** — Maps em memória (`users`, `posts`), seed determinístico (3 usuários, 12 posts com timestamps fixos, likes e comentários iniciais). Likes como `Set<userId>` ⇒ idempotência por construção. `resetStore()` para isolamento dos testes.
- **Middleware (`auth.ts`)** — extrai `Authorization: Bearer mock-token-<userId>`; `requireAuth` responde 401 (`UNAUTHORIZED`) se ausente/inválido; `optionalAuth` popula `req.userId` quando possível (usado na feed para `likedByMe`).
- **Rotas** — validação com Zod (e-mail, body do comentário 1..500, `limit` 1..20, cursor base64 válido); erros padronizados `{ error: { code, message } }`.

### Cursor pagination
- Ordenação: `createdAt` DESC, desempate `id` DESC.
- Cursor = `base64url(createdAt + "|" + id)` do último item retornado.
- Página seguinte: itens estritamente "depois" do cursor na ordenação. `nextCursor: null` quando não há mais itens.

### Decisões
| Decisão | Alternativa rejeitada | Motivo |
|---|---|---|
| Express | Fastify/NestJS | exigido pela guia de setup; mais simples de revisar |
| Set para likes | contador + flag | idempotência por construção, count derivado |
| Cursor opaco base64 | offset | exigido pelo enunciado; estável a inserções |
| Token `mock-token-<id>` | JWT | exatamente o formato dos curl da guia oficial |
| Vitest + Supertest | Jest | indicado na guia de setup; mais rápido em TS |

## Mobile

### Camadas
- **`api/config.ts`** — `API_BASE_URL` em um único ponto, com comentário sobre 10.0.2.2 / localhost / IP local.
- **`api/client.ts`** — wrapper de `fetch` tipado, injeta `Authorization`, converte erros HTTP em `ApiError` com mensagem da API.
- **`AuthContext`** — `login(email)`, `logout()`, restauração do token de AsyncStorage no boot (`restoring` state).
- **`FeedScreen`** — estados explícitos: `loading` (primeira página), `error` (+ botão retry), `empty`, `loadingMore`, `refreshing`. Acumula páginas via `nextCursor`, deduplica por `id`.
- **`PostCard`** — like com `pending` por post (botão desabilitado durante request) + optimistic update com rollback.
- **`CommentsModal`** — carrega comentários ao abrir (loading/error), criação com validação local (vazio) + erro de API visível, atualiza `commentsCount` no feed via callback.

### Fluxo de dados
```
[LoginScreen] → login(email) → POST /v1/auth/login → token em AsyncStorage → [FeedScreen]
[FeedScreen]  → GET /v1/feed?limit=10&cursor=... → FlatList (load more / refresh)
[PostCard]    → POST|DELETE /v1/posts/:id/like  → optimistic + rollback
[CommentsModal] → GET|POST /v1/posts/:id/comments → lista + commentsCount
```

## Tecnologias

| Componente | Tecnologia | Versão |
|---|---|---|
| Runtime backend | Node.js | 20+ |
| Framework HTTP | Express | 5.x |
| Validação | Zod | 4.x |
| Dev runner | tsx (watch) | latest |
| Testes backend | Vitest + Supertest | latest |
| Mobile | Expo (blank-typescript) | SDK atual |
| Storage mobile | @react-native-async-storage/async-storage | via expo install |
| HTTP mobile | fetch nativo | — |

## Testes

### Backend (automatizados — Vitest + Supertest)
1. Login mock retorna `accessToken` + `user`; e-mail inválido → 400.
2. Feed: ordenação, `limit`, paginação completa por cursor sem duplicados/sem buracos; `limit > 20` → 400.
3. Like idempotente: duas chamadas → mesmo `likesCount`; 401 sem token; 404 post inexistente.
4. Unlike idempotente: duas chamadas → coerente, nunca negativo.
5. Comentários: criação atualiza `commentsCount`; vazio/>500 → 400; post inexistente → 404; `likedByMe` reflete o usuário do token.

### Mobile (manuais — documentados no README)
1. Login com `ada@ivory.test` → token salvo e feed carregada.
2. Like/unlike → UI e count atualizam, sem duplo tap descontrolado, rollback em erro.
3. Comentário → lista e `commentsCount` atualizados.
4. Comentário vazio → mensagem de erro visível, sem chamada à API.
5. Load more → posts adicionais sem duplicados.

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| URL errada emulator/device | `config.ts` único + tabela no README (10.0.2.2 / localhost / IP) |
| Duplo tap no like | flag `pending` por post desabilita botão |
| Drift de likesCount | count derivado de `Set.size`, nunca incrementado |
| Duplicados no load more | dedupe por `id` ao concatenar páginas |
| Dados perdidos no restart | aceito (em memória); documentado como melhoria |
