# Specification — Ivory Mini Feed (React Native + Backend)

## Overview

Mini application composed of a backend API (Node.js + TypeScript) and a mobile app (React Native + TypeScript with Expo) actually connected to the backend. Features: mock login, cursor-paginated feed, idempotent like/unlike, comments, and UI states (loading/error/empty/pending). Data kept in memory with a deterministic seed.

Requirement sources: `01_Test_Tecnico_Candidato_Mini_Feed_ReactNative.pdf`, `03_Guida_Setup_E_Consegna_ReactNative.pdf` and `Checklist_Consegna_ReactNative_Candidato.md` (Ivory, 2026-06-10).

## Functional Requirements — Backend

### FR01 — Mock login — `POST /v1/auth/login`
- Receives `{ "email": string }`; the email must be valid (400 otherwise).
- Returns `{ accessToken, user }`.
- Mock token in the format `mock-token-<userId>` (compatible with the guide's curl examples: `Bearer mock-token-user-1`).
- Seed users: `ada@ivory.test` → `user-1`, `bruno@ivory.test` → `user-2`, `carla@ivory.test` → `user-3`. Unknown emails create a new mock user (login always works).

### FR02 — Paginated feed — `GET /v1/feed?limit=3&cursor=...`
- List of posts ordered by `createdAt` descending (newest first), tie-broken by `id`.
- Cursor pagination: response `{ items, nextCursor }`; `nextCursor: null` on the last page.
- Default `limit` 10, maximum 20 (400 for an invalid `limit`; values above 20 are rejected).
- 400 for a malformed `cursor`.
- Each item: `id`, `authorId`, `body`, `createdAt`, `likesCount`, `commentsCount`, `likedByMe`.
- Optional authentication: with a valid `Authorization: Bearer <token>`, `likedByMe` reflects the user; without a token, `likedByMe = false` (the guide's curl examples call the feed without the header).

### FR03 — Like — `POST /v1/posts/:postId/like` (protected)
- 401 without a valid token; 404 when the post does not exist.
- **Idempotent:** a double call does not duplicate the like; `likesCount` stays correct.
- Returns `{ postId, likedByMe: true, likesCount }`.

### FR04 — Unlike — `DELETE /v1/posts/:postId/like` (protected)
- 401 without a valid token; 404 when the post does not exist.
- **Idempotent:** a double call stays consistent (no negative counter).
- Returns `{ postId, likedByMe: false, likesCount }`.

### FR05 — List comments — `GET /v1/posts/:postId/comments`
- 404 when the post does not exist.
- Returns `{ items, commentsCount }` ordered by `createdAt` ascending.

### FR06 — Create comment — `POST /v1/posts/:postId/comments` (protected)
- 401 without a valid token; 404 when the post does not exist.
- Body `{ "body": string }`: non-empty (after trim) and at most 500 characters — 400 otherwise.
- Returns `{ comment, commentsCount }` (201).

## Functional Requirements — React Native App

### FR07 — Mock login
- Email input + login button; calls `POST /v1/auth/login`.
- Token stored in AsyncStorage (restored when reopening the app); authenticated state; logout clears the token and returns to login.
- Visible errors (invalid email, network failure).

### FR08 — Feed
- List of posts showing `authorId`, `body`, formatted date, `likesCount`, `commentsCount`, `likedByMe`.
- "Load more" button/scroll using `nextCursor` (no duplicated posts).
- Pull-to-refresh reloads the first page.

### FR09 — Like/unlike
- Button connected to the backend with per-post pending state (prevents double tap).
- Implemented extra: optimistic update with rollback on API error, with a visible error message.

### FR10 — Comments
- View a post's comments; create a comment.
- After creating: list and `commentsCount` updated.
- Visible error for an empty comment and for an API failure.

### FR11 — UI states
- Feed loading (initial spinner), feed error (message + retry), empty feed (empty state), pending during like and while sending a comment.

## Non-Functional Requirements

### NFR01 — Stack
- Backend: Node.js 20+, TypeScript, Express, Zod, UUID. Dev: tsx, Vitest, Supertest.
- Mobile: React Native + TypeScript via Expo (blank-typescript template), AsyncStorage, native fetch.

### NFR02 — Storage
- In-memory data (Maps/arrays), no external database. Deterministic seed: 3 users, 12 posts, initial comments and likes.

### NFR03 — Backend URL from mobile
- Android Emulator: `http://10.0.2.2:3000`
- iOS Simulator (macOS): `http://localhost:3000`
- Expo Go / physical device: `http://<your-computer-local-IP>:3000`
- Configurable in a single place (`mobile/src/api/config.ts`).

### NFR04 — Errors and security
- Standardized error responses `{ error: { code, message } }`; helmet + cors enabled; no secrets in the repository.

### NFR05 — Tests
- Backend: ≥ 5 automated tests (Vitest + Supertest) covering login, pagination, like/unlike idempotency, comments and validation.
- Mobile: ≥ 4 manual cases documented in the README (login/feed, like/unlike, comment, empty-comment error).

### NFR06 — Delivery
- README with: installation, backend startup, RN app startup, backend URL, tests, technical choices, improvements and AI/tool usage.
- No `node_modules` and no secrets; delivery within 24h.

## User Stories

### US01 — Login
**As** a user, **I want** to sign in with my email, **so that** I can access the feed authenticated.
- With `ada@ivory.test` I get a token and the feed loads.
- The token persists when reopening the app; logout returns to the login screen.

### US02 — Browse the feed
**As** a user, **I want** to see the newest posts and load more, **so that** I can follow the content.
- First page loads with a spinner; "Load more" appends the next page with no duplicates; the last page hides the button.

### US03 — Like/unlike
**As** a user, **I want** to like/unlike a post, **so that** I can react to the content.
- A tap updates the UI and the count immediately (optimistic); an API error rolls back and shows a message; a double tap does not fire a duplicated request.

### US04 — Comment
**As** a user, **I want** to read and create comments, **so that** I can interact with a post.
- Creating a comment updates the list and `commentsCount`; an empty comment shows an error without calling the API.

## Data Model (in memory)

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

## REST API

| Method | Endpoint                       | Auth      | Description                                          |
|--------|--------------------------------|-----------|----------------------------------------------------|
| POST   | /v1/auth/login                 | —         | Mock login; returns `accessToken` and `user`        |
| GET    | /v1/feed?limit=&cursor=        | optional  | Cursor-paginated feed; `limit` max 20               |
| POST   | /v1/posts/:postId/like         | Bearer    | Idempotent like                                     |
| DELETE | /v1/posts/:postId/like         | Bearer    | Idempotent unlike                                   |
| GET    | /v1/posts/:postId/comments     | —         | Lists comments; 404 when the post does not exist    |
| POST   | /v1/posts/:postId/comments     | Bearer    | Creates a comment (1..500 chars); returns the count |
| GET    | /health                        | —         | Healthcheck                                         |
