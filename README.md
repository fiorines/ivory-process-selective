# Ivory Mini Feed — React Native + Backend

Ivory technical test: mini application with a **backend API (Node.js + TypeScript + Express)** and a **mobile app (React Native + TypeScript with Expo)** actually connected to the backend.

Features: mock login, cursor-paginated feed, idempotent like/unlike, comments, and UI states (loading / error / empty / pending).

## Structure

```
ivory-process-seletive/
├── backend/        # Express + TypeScript API (in-memory data)
├── mobile/         # Expo app (blank-typescript)
├── .specify/       # SPEC-DRIVEN artifacts (constitution, spec, plan, tasks)
└── README.md
```

> The project was developed with the **spec-driven methodology (GitHub spec-kit)**: requirements, technical plan and tasks live in `.specify/specs/mini-feed/`.

## Installation

Prerequisites: **Node.js 20+** (tested with Node 26), npm, and **Expo Go** on your phone or an Android emulator / iOS simulator.

```bash
# Backend
cd backend
npm install

# Mobile
cd ../mobile
npm install
```

## How to run

### 1. Backend (port 3000)

```bash
cd backend
npm run dev      # tsx watch (or: npm start)
```

The server listens on `0.0.0.0:3000` (reachable from the emulator and from devices on the local network).
Healthcheck: `GET http://localhost:3000/health`.

### 2. React Native app

**Before opening the app**, adjust the backend URL in [`mobile/src/api/config.ts`](mobile/src/api/config.ts):

| Environment                 | `API_BASE_URL`                          |
|-----------------------------|------------------------------------------|
| Android Emulator            | `http://10.0.2.2:3000` (current default) |
| iOS Simulator (macOS)       | `http://localhost:3000`                  |
| Expo Go / physical device   | `http://<your-computer-local-IP>:3000` (e.g. `http://192.168.1.50:3000` — find it with `ipconfig`/`ifconfig`; computer and phone on the same Wi-Fi network) |

```bash
cd mobile
npx expo start
```

Open with **Expo Go** (QR code), key `a` (Android emulator) or `i` (iOS simulator).

### 3. Login

Use `ada@ivory.test` (or `bruno@ivory.test`, `carla@ivory.test`). Any valid email also works — the mock login creates the user on the fly.

## API

| Method | Endpoint                      | Auth            | Description |
|--------|-------------------------------|-----------------|-----------|
| POST   | `/v1/auth/login`              | —               | Mock login via email. Returns `accessToken` (`mock-token-<userId>`) and `user`. |
| GET    | `/v1/feed?limit=3&cursor=...` | optional        | Ordered feed (newest first), cursor pagination, `limit` max 20. Items carry `likedByMe`, `likesCount`, `commentsCount`. |
| POST   | `/v1/posts/:postId/like`      | Bearer          | **Idempotent** like (a double call does not duplicate). 404 when the post does not exist. |
| DELETE | `/v1/posts/:postId/like`      | Bearer          | **Idempotent** unlike (a double call stays consistent). |
| GET    | `/v1/posts/:postId/comments`  | —               | Lists comments. 404 when the post does not exist. |
| POST   | `/v1/posts/:postId/comments`  | Bearer          | Creates a comment (non-empty, max 500 chars). Returns `comment` + `commentsCount`. |

Standardized errors: `{ "error": { "code": "...", "message": "..." } }` — `400` validation, `401` missing token, `404` missing resource.

### Essential curl commands

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@ivory.test"}'

curl "http://localhost:3000/v1/feed?limit=3"

curl -X POST http://localhost:3000/v1/posts/post-1/like \
  -H "Authorization: Bearer mock-token-user-1"
```

## Tests

### Backend — automated (Vitest + Supertest)

```bash
cd backend
npm test
```

**14 tests** covering:

1. **Mock login** — returns `accessToken` + `user`; 400 for invalid/missing email; unknown email creates a user.
2. **Feed** — descending ordering, required fields, full cursor pagination with no duplicates/no gaps, 400 for `limit > 20` and malformed cursor, `likedByMe` reflecting the token.
3. **Idempotent like** — a double call keeps `likesCount`; 401 without token; 404 missing post.
4. **Idempotent unlike** — a double call stays consistent, never negative; does not affect other users' likes.
5. **Comments** — creation updates `commentsCount`; 400 for empty and > 500 chars; 404 missing post; 401 without token.

### Mobile — documented manual test cases

| # | Case | Steps | Expected result |
|---|------|--------|--------------------|
| 1 | **Login + feed** | Open the app, sign in with `ada@ivory.test` | Token obtained and stored (AsyncStorage); feed loads the first page with a spinner during the load |
| 2 | **Like/unlike** | Tap the heart on a post; tap it again | UI and count update immediately (optimistic update); button goes pending (no double tap); on API error, rollback + error banner |
| 3 | **Comment** | Open the comments of a post, write and send | Comment shows up in the list and the post's `commentsCount` updates in the feed |
| 4 | **Empty comment error** | Open comments, send an empty/whitespace-only comment | "Comment cannot be empty." message visible; no API call made |
| 5 | **Load more** | Scroll to the end / tap "Load more" | Next page is appended with no duplicated posts; at the end, "You have reached the end of the feed." |

Verifiable extras: pull-to-refresh reloads the feed; sign out goes back to login; closing and reopening the app keeps the session; with the backend down, the feed shows an error with a "Try again" button.

## Technical choices

- **Express 5 + Zod** — validation at the API boundary (email, `limit` 1..20, cursor, comment 1..500 chars) with semantic HTTP errors and a standardized payload.
- **In-memory data with deterministic seed** — 3 users, 12 posts, initial likes and comments. No database: the test focuses on correct endpoints, idempotency and integration. `resetStore()` isolates every automated test.
- **Idempotency by construction** — likes are a `Set<userId>` per post; `likesCount` is derived (`set.size`), never an incremented counter. Double like/unlike causes no drift.
- **Cursor pagination** — opaque cursor `base64url(createdAt|id)` over a `createdAt DESC, id DESC` ordering; the `id` tie-break guarantees pages with no gaps and no duplicates.
- **Mock token `mock-token-<userId>`** — exactly the format of the curl examples in the guide (`Bearer mock-token-user-1`). No JWT: real authentication is not the goal of the test and there are no secrets in the repo.
- **Mobile without state/navigation libraries** — React Context for auth (token in AsyncStorage, restored on boot), local state per screen, native `fetch` with a typed client (`ApiError`). Two "screens" (Login/Feed) switched by condition + a comments modal: the scope does not justify react-navigation/Redux.
- **Explicit UI states** — initial loading, error with retry, empty feed, `refreshing`, `loadingMore`, per-post pending on like and pending while sending a comment.
- **Optimistic update with rollback (the suggested extra)** — the like updates the UI instantly, reconciles with the backend response and rolls back with a visible error message if the call fails.

## Future improvements

- Real database (PostgreSQL/SQLite) with migrations and repositories.
- Real authentication (JWT with expiration/refresh) and users with passwords.
- Mobile tests (React Native Testing Library + MSW) and E2E (Maestro/Detox).
- Comment pagination and optimized counting for large feeds.
- Structured logging (pino), rate limiting and observability.
- CI (GitHub Actions): typecheck + tests on every PR.
- Backend deploy (Render/Fly.io) and EAS build of the app.

## AI / internet usage (declaration)

- Project developed with the help of **Claude Code (Anthropic)** as a pair-programming tool, following the **spec-driven methodology (GitHub spec-kit)**: the requirements from the test PDFs were converted into `spec.md`, `plan.md` and `tasks.md` (in `.specify/`) before implementation.
- Official documentation consulted: Expo, React Native, Express and Zod.
- All the code was reviewed, executed and validated locally: 14 backend automated tests passing and endpoints verified via curl.

## Known limitations

- In-memory data: restarting the backend restores the seed (created likes/comments are lost).
- `authorId` is shown instead of the author's name in the feed (the feed API does not expand the author — a scope decision).
- No automated mobile tests (manual cases documented above, as allowed by the test instructions).
