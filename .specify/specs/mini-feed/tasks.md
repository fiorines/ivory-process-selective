# Tasks — Ivory Mini Feed (React Native + Backend)

## Fase 1: Setup do Projeto

- [x] **T01** — Criar estrutura do projeto (backend/, mobile/, .specify/, README.md)
  - Dependências: nenhuma

- [x] **T02** — Escrever artefatos SPEC-DRIVEN (constitution, spec, plan, tasks)
  - Dependências: T01

- [x] **T03** — Scaffold do mobile com `create-expo-app --template blank-typescript`
  - Dependências: T01

- [x] **T04** — `package.json` + `tsconfig.json` do backend (express, cors, helmet, zod, uuid; tsx, vitest, supertest)
  - Dependências: T01

## Fase 2: Backend API

- [x] **T05** — Tipos de domínio e DTOs (`src/types.ts`)
  - Dependências: T04

- [x] **T06** — Store em memória com seed determinístico (`src/store.ts`)
  - Dependências: T05
  - 3 usuários, 12 posts, likes como Set, comentários iniciais, `resetStore()`

- [x] **T07** — Middleware de auth mock (`src/middleware/auth.ts`)
  - Dependências: T06
  - `requireAuth` (401) e `optionalAuth`; token `mock-token-<userId>`

- [x] **T08** — `POST /v1/auth/login` (`src/routes/auth.ts`)
  - Dependências: T07
  - Zod e-mail; retorna accessToken + user; 400 inválido

- [x] **T09** — `GET /v1/feed` com cursor pagination (`src/routes/feed.ts`)
  - Dependências: T07
  - limit padrão 10 / máx 20, cursor base64, likedByMe, nextCursor

- [x] **T10** — Like/unlike idempotentes + comentários (`src/routes/posts.ts`)
  - Dependências: T07
  - POST/DELETE like (401/404, idempotente); GET/POST comments (404, body 1..500)

- [x] **T11** — `createApp()` + entry point (`src/app.ts`, `src/server.ts`)
  - Dependências: T08, T09, T10
  - helmet, cors, json, rotas, 404 handler, error handler

## Fase 3: Testes Backend

- [x] **T12** — Testes Vitest + Supertest (≥ 5) (`tests/api.test.ts`)
  - Dependências: T11
  - login, paginação por cursor, like/unlike idempotentes, comentários, validações, 401/404

## Fase 4: App React Native

- [x] **T13** — Config da API + client tipado (`src/api/config.ts`, `src/api/client.ts`)
  - Dependências: T03
  - API_BASE_URL (10.0.2.2/localhost/IP), ApiError, Authorization header

- [x] **T14** — AuthContext com AsyncStorage (`src/context/AuthContext.tsx`)
  - Dependências: T13
  - login/logout, restauração do token no boot

- [x] **T15** — LoginScreen (`src/screens/LoginScreen.tsx`)
  - Dependências: T14
  - input e-mail, loading, erro visível

- [x] **T16** — FeedScreen (`src/screens/FeedScreen.tsx`)
  - Dependências: T14
  - FlatList, loading/error/empty, load more sem duplicados, pull-to-refresh, logout

- [x] **T17** — PostCard com like optimistic + pending (`src/components/PostCard.tsx`)
  - Dependências: T16
  - rollback em erro, botão desabilitado durante request

- [x] **T18** — CommentsModal (`src/components/CommentsModal.tsx`)
  - Dependências: T16
  - lista, criação, erro de vazio/API, atualiza commentsCount no feed

- [x] **T19** — `App.tsx` integrando AuthProvider + telas
  - Dependências: T15, T16

## Fase 5: Entrega

- [x] **T20** — README.md completo (instalação, avvio, URL backend, testes, escolhas, melhorias, uso de AI)
  - Dependências: T12, T19

- [x] **T21** — `.gitignore` (node_modules, .expo, dist) + verificação sem segredos
  - Dependências: T01

- [x] **T22** — Rodar testes do backend e validar endpoints com curl
  - Dependências: T12

- [x] **T23** — Git init + commit (entrega via GitHub/zip sem node_modules)
  - Dependências: T20, T21, T22
