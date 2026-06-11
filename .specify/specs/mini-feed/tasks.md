# Tasks — Ivory Mini Feed (React Native + Backend)

## Phase 1: Project Setup

- [x] **T01** — Create the project structure (backend/, mobile/, .specify/, README.md)
  - Dependencies: none

- [x] **T02** — Write the SPEC-DRIVEN artifacts (constitution, spec, plan, tasks)
  - Dependencies: T01

- [x] **T03** — Scaffold the mobile app with `create-expo-app --template blank-typescript`
  - Dependencies: T01

- [x] **T04** — Backend `package.json` + `tsconfig.json` (express, cors, helmet, zod, uuid; tsx, vitest, supertest)
  - Dependencies: T01

## Phase 2: Backend API

- [x] **T05** — Domain types and DTOs (`src/types.ts`)
  - Dependencies: T04

- [x] **T06** — In-memory store with deterministic seed (`src/store.ts`)
  - Dependencies: T05
  - 3 users, 12 posts, likes as a Set, initial comments, `resetStore()`

- [x] **T07** — Mock auth middleware (`src/middleware/auth.ts`)
  - Dependencies: T06
  - `requireAuth` (401) and `optionalAuth`; token `mock-token-<userId>`

- [x] **T08** — `POST /v1/auth/login` (`src/routes/auth.ts`)
  - Dependencies: T07
  - Zod email; returns accessToken + user; 400 invalid

- [x] **T09** — `GET /v1/feed` with cursor pagination (`src/routes/feed.ts`)
  - Dependencies: T07
  - default limit 10 / max 20, base64 cursor, likedByMe, nextCursor

- [x] **T10** — Idempotent like/unlike + comments (`src/routes/posts.ts`)
  - Dependencies: T07
  - POST/DELETE like (401/404, idempotent); GET/POST comments (404, body 1..500)

- [x] **T11** — `createApp()` + entry point (`src/app.ts`, `src/server.ts`)
  - Dependencies: T08, T09, T10
  - helmet, cors, json, routes, 404 handler, error handler

## Phase 3: Backend Tests

- [x] **T12** — Vitest + Supertest tests (≥ 5) (`tests/api.test.ts`)
  - Dependencies: T11
  - login, cursor pagination, idempotent like/unlike, comments, validation, 401/404

## Phase 4: React Native App

- [x] **T13** — API config + typed client (`src/api/config.ts`, `src/api/client.ts`)
  - Dependencies: T03
  - API_BASE_URL (10.0.2.2/localhost/IP), ApiError, Authorization header

- [x] **T14** — AuthContext with AsyncStorage (`src/context/AuthContext.tsx`)
  - Dependencies: T13
  - login/logout, token restoration at boot

- [x] **T15** — LoginScreen (`src/screens/LoginScreen.tsx`)
  - Dependencies: T14
  - email input, loading, visible error

- [x] **T16** — FeedScreen (`src/screens/FeedScreen.tsx`)
  - Dependencies: T14
  - FlatList, loading/error/empty, load more with no duplicates, pull-to-refresh, logout

- [x] **T17** — PostCard with optimistic like + pending (`src/components/PostCard.tsx`)
  - Dependencies: T16
  - rollback on error, button disabled during the request

- [x] **T18** — CommentsModal (`src/components/CommentsModal.tsx`)
  - Dependencies: T16
  - list, creation, empty/API error, updates commentsCount in the feed

- [x] **T19** — `App.tsx` wiring AuthProvider + screens
  - Dependencies: T15, T16

## Phase 5: Delivery

- [x] **T20** — Complete README.md (installation, startup, backend URL, tests, choices, improvements, AI usage)
  - Dependencies: T12, T19

- [x] **T21** — `.gitignore` (node_modules, .expo, dist) + no-secrets verification
  - Dependencies: T01

- [x] **T22** — Run the backend tests and validate the endpoints with curl
  - Dependencies: T12

- [x] **T23** — Git init + commit (delivery via GitHub/zip without node_modules)
  - Dependencies: T20, T21, T22
