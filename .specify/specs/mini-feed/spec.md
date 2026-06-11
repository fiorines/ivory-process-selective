# Specification — Ivory Mini Feed (React Native + Backend)

## Visão Geral

Mini aplicação composta por uma API backend (Node.js + TypeScript) e um app mobile (React Native + TypeScript com Expo) realmente conectado ao backend. Funcionalidades: login mock, feed paginada por cursor, like/unlike idempotente, comentários e estados de UI (loading/error/empty/pending). Dados mantidos em memória com seed determinístico.

Fonte dos requisitos: `01_Test_Tecnico_Candidato_Mini_Feed_ReactNative.pdf`, `03_Guida_Setup_E_Consegna_ReactNative.pdf` e `Checklist_Consegna_ReactNative_Candidato.md` (Ivory, 10/06/2026).

## Requisitos Funcionais — Backend

### RF01 — Login mock — `POST /v1/auth/login`
- Recebe `{ "email": string }`; e-mail deve ser válido (400 caso contrário).
- Retorna `{ accessToken, user }`.
- Token mock no formato `mock-token-<userId>` (compatível com os exemplos de curl da guia: `Bearer mock-token-user-1`).
- Usuários seed: `ada@ivory.test` → `user-1`, `bruno@ivory.test` → `user-2`, `carla@ivory.test` → `user-3`. E-mails desconhecidos criam um novo usuário mock (login sempre funciona).

### RF02 — Feed paginada — `GET /v1/feed?limit=3&cursor=...`
- Lista de posts ordenada por `createdAt` decrescente (mais recente primeiro), desempate por `id`.
- Cursor pagination: resposta `{ items, nextCursor }`; `nextCursor: null` na última página.
- `limit` padrão 10, máximo 20 (400 se `limit` inválido; valores acima de 20 são rejeitados).
- 400 se `cursor` malformado.
- Cada item: `id`, `authorId`, `body`, `createdAt`, `likesCount`, `commentsCount`, `likedByMe`.
- Autenticação opcional: com `Authorization: Bearer <token>` válido, `likedByMe` reflete o usuário; sem token, `likedByMe = false` (os curl de exemplo da guia chamam a feed sem header).

### RF03 — Like — `POST /v1/posts/:postId/like` (protegido)
- 401 sem token válido; 404 se o post não existe.
- **Idempotente:** chamada dupla não duplica o like; `likesCount` permanece correto.
- Retorna `{ postId, likedByMe: true, likesCount }`.

### RF04 — Unlike — `DELETE /v1/posts/:postId/like` (protegido)
- 401 sem token válido; 404 se o post não existe.
- **Idempotente:** chamada dupla permanece coerente (sem contador negativo).
- Retorna `{ postId, likedByMe: false, likesCount }`.

### RF05 — Listar comentários — `GET /v1/posts/:postId/comments`
- 404 se o post não existe.
- Retorna `{ items, commentsCount }` ordenados por `createdAt` crescente.

### RF06 — Criar comentário — `POST /v1/posts/:postId/comments` (protegido)
- 401 sem token válido; 404 se o post não existe.
- Body `{ "body": string }`: não vazio (após trim) e máximo 500 caracteres — 400 caso contrário.
- Retorna `{ comment, commentsCount }` (201).

## Requisitos Funcionais — App React Native

### RF07 — Login mock
- Input de e-mail + botão de login; chama `POST /v1/auth/login`.
- Token salvo em AsyncStorage (restaurado ao reabrir o app); estado autenticado; logout limpa token e volta ao login.
- Erros visíveis (e-mail inválido, falha de rede).

### RF08 — Feed
- Lista de posts exibindo `authorId`, `body`, data formatada, `likesCount`, `commentsCount`, `likedByMe`.
- Botão/scroll "Load more" usando `nextCursor` (sem duplicar posts).
- Pull-to-refresh recarrega a primeira página.

### RF09 — Like/unlike
- Botão conectado ao backend com estado pending por post (previne duplo tap).
- Extra implementado: optimistic update com rollback em caso de erro da API, com mensagem de erro visível.

### RF10 — Comentários
- Visualizar comentários de um post; criar comentário.
- Após criar: lista e `commentsCount` atualizados.
- Erro visível para comentário vazio e para falha da API.

### RF11 — Estados de UI
- Loading do feed (spinner inicial), erro do feed (mensagem + retry), feed vazia (empty state), pending durante like e durante envio de comentário.

## Requisitos Não-Funcionais

### RNF01 — Stack
- Backend: Node.js 20+, TypeScript, Express, Zod, UUID. Dev: tsx, Vitest, Supertest.
- Mobile: React Native + TypeScript via Expo (template blank-typescript), AsyncStorage, fetch nativo.

### RNF02 — Armazenamento
- Dados em memória (Maps/arrays), sem banco externo. Seed determinístico: 3 usuários, 12 posts, comentários e likes iniciais.

### RNF03 — URL do backend a partir do mobile
- Android Emulator: `http://10.0.2.2:3000`
- iOS Simulator (macOS): `http://localhost:3000`
- Expo Go / device físico: `http://<IP-local-do-computador>:3000`
- Configurável em um único ponto (`mobile/src/api/config.ts`).

### RNF04 — Erros e segurança
- Respostas de erro padronizadas `{ error: { code, message } }`; helmet + cors habilitados; sem segredos no repositório.

### RNF05 — Testes
- Backend: ≥ 5 testes automatizados (Vitest + Supertest) cobrindo login, paginação, idempotência de like/unlike, comentários e validações.
- Mobile: ≥ 4 casos manuais documentados no README (login/feed, like/unlike, comentário, erro de comentário vazio).

### RNF06 — Entrega
- README com: instalação, avvio backend, avvio app RN, URL do backend, testes, escolhas técnicas, melhorias e uso de AI/tools.
- Sem `node_modules` e sem segredos; entrega em 24h.

## User Stories

### US01 — Login
**Como** usuário, **quero** entrar com meu e-mail, **para** acessar a feed autenticado.
- Com `ada@ivory.test` obtenho token e a feed carrega.
- Token persiste ao reabrir o app; logout volta para a tela de login.

### US02 — Navegar a feed
**Como** usuário, **quero** ver os posts mais recentes e carregar mais, **para** acompanhar o conteúdo.
- Primeira página carrega com spinner; "Load more" anexa a página seguinte sem duplicados; última página esconde o botão.

### US03 — Curtir/descurtir
**Como** usuário, **quero** dar like/unlike em um post, **para** reagir ao conteúdo.
- Tap atualiza UI e contagem imediatamente (optimistic); erro da API faz rollback e mostra mensagem; duplo tap não dispara requisição duplicada.

### US04 — Comentar
**Como** usuário, **quero** ler e criar comentários, **para** interagir com um post.
- Criar comentário atualiza lista e `commentsCount`; comentário vazio mostra erro sem chamar a API.

## Modelo de Dados (em memória)

```typescript
interface User {
  id: string;          // "user-1"
  email: string;
  name: string;
}

interface Post {
  id: string;          // "post-1"
  authorId: string;
  body: string;
  createdAt: string;   // ISO 8601
  likedBy: Set<string>;     // userIds — likesCount = likedBy.size
  comments: Comment[];      // commentsCount = comments.length
}

interface Comment {
  id: string;          // UUID
  postId: string;
  authorId: string;
  body: string;        // 1..500 chars
  createdAt: string;   // ISO 8601
}
```

## API REST

| Método | Endpoint                       | Auth      | Descrição                                          |
|--------|--------------------------------|-----------|----------------------------------------------------|
| POST   | /v1/auth/login                 | —         | Login mock; retorna `accessToken` e `user`          |
| GET    | /v1/feed?limit=&cursor=        | opcional  | Feed paginada por cursor; `limit` máx 20            |
| POST   | /v1/posts/:postId/like         | Bearer    | Like idempotente                                    |
| DELETE | /v1/posts/:postId/like         | Bearer    | Unlike idempotente                                  |
| GET    | /v1/posts/:postId/comments     | —         | Lista comentários; 404 se post inexistente          |
| POST   | /v1/posts/:postId/comments     | Bearer    | Cria comentário (1..500 chars); retorna count       |
| GET    | /health                        | —         | Healthcheck                                         |
