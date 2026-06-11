# Plan — Ivory Mini Feed (React Native + Backend)

## Technical Architecture

```
ivory-process-seletive/
├── .specify/                       # SPEC-DRIVEN artifacts
│   ├── memory/constitution.md
│   └── specs/mini-feed/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
├── backend/
│   ├── src/
│   │   ├── app.ts                  # createApp(): Express + middlewares + routes
│   │   ├── server.ts               # Entry point (port 3000)
│   │   ├── types.ts                # Domain types and DTOs
│   │   ├── store.ts                # In-memory store + deterministic seed
│   │   ├── middleware/
│   │   │   └── auth.ts             # requireAuth / optionalAuth (mock Bearer)
│   │   └── routes/
│   │       ├── auth.ts             # POST /v1/auth/login
│   │       ├── feed.ts             # GET /v1/feed (cursor pagination)
│   │       └── posts.ts            # like/unlike + comments
│   ├── tests/
│   │   └── api.test.ts             # Vitest + Supertest (≥ 5 tests)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── mobile/
│   ├── App.tsx                     # AuthProvider + Login/Feed switch
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── api/
│       │   ├── config.ts           # API_BASE_URL (10.0.2.2 / localhost / IP)
│       │   └── client.ts           # typed fetch + ApiError
│       ├── context/
│       │   └── AuthContext.tsx     # token + user in AsyncStorage
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   └── FeedScreen.tsx      # FlatList + load more + refresh
│       ├── components/
│       │   ├── PostCard.tsx        # post + like button (pending/optimistic)
│       │   └── CommentsModal.tsx   # comment list + creation
│       └── types.ts                # Shared API types
└── README.md
```

## Backend

### Layers
- **Store (`store.ts`)** — in-memory Maps (`users`, `posts`), deterministic seed (3 users, 12 posts with fixed timestamps, initial likes and comments). Likes as `Set<userId>` ⇒ idempotency by construction. `resetStore()` for test isolation.
- **Middleware (`auth.ts`)** — extracts `Authorization: Bearer mock-token-<userId>`; `requireAuth` responds 401 (`UNAUTHORIZED`) when missing/invalid; `optionalAuth` fills `req.userId` when possible (used by the feed for `likedByMe`).
- **Routes** — validation with Zod (email, comment body 1..500, `limit` 1..20, valid base64 cursor); standardized errors `{ error: { code, message } }`.

### Cursor pagination
- Ordering: `createdAt` DESC, tie-break `id` DESC.
- Cursor = `base64url(createdAt + "|" + id)` of the last returned item.
- Next page: items strictly "after" the cursor in the ordering. `nextCursor: null` when there are no more items.

### Decisions
| Decision | Rejected alternative | Reason |
|---|---|---|
| Express | Fastify/NestJS | required by the setup guide; simpler to review |
| Set for likes | counter + flag | idempotency by construction, derived count |
| Opaque base64 cursor | offset | required by the statement; stable under inserts |
| Token `mock-token-<id>` | JWT | exactly the format of the official guide's curl examples |
| Vitest + Supertest | Jest | suggested by the setup guide; faster in TS |

## Mobile

### Layers
- **`api/config.ts`** — `API_BASE_URL` in a single place, with a comment about 10.0.2.2 / localhost / local IP.
- **`api/client.ts`** — typed `fetch` wrapper, injects `Authorization`, converts HTTP errors into an `ApiError` carrying the API message.
- **`AuthContext`** — `login(email)`, `logout()`, token restoration from AsyncStorage at boot (`restoring` state).
- **`FeedScreen`** — explicit states: `loading` (first page), `error` (+ retry button), `empty`, `loadingMore`, `refreshing`. Accumulates pages via `nextCursor`, dedupes by `id`.
- **`PostCard`** — like with per-post `pending` (button disabled during the request) + optimistic update with rollback.
- **`CommentsModal`** — loads comments on open (loading/error), creation with local validation (empty) + visible API error, updates `commentsCount` in the feed via callback.

### Data flow
```
[LoginScreen] → login(email) → POST /v1/auth/login → token in AsyncStorage → [FeedScreen]
[FeedScreen]  → GET /v1/feed?limit=10&cursor=... → FlatList (load more / refresh)
[PostCard]    → POST|DELETE /v1/posts/:id/like  → optimistic + rollback
[CommentsModal] → GET|POST /v1/posts/:id/comments → list + commentsCount
```

## Technologies

| Component | Technology | Version |
|---|---|---|
| Backend runtime | Node.js | 20+ |
| HTTP framework | Express | 5.x |
| Validation | Zod | 3.x |
| Dev runner | tsx (watch) | latest |
| Backend tests | Vitest + Supertest | latest |
| Mobile | Expo (blank-typescript) | current SDK |
| Mobile storage | @react-native-async-storage/async-storage | via expo install |
| Mobile HTTP | native fetch | — |

## Tests

### Backend (automated — Vitest + Supertest)
1. Mock login returns `accessToken` + `user`; invalid email → 400.
2. Feed: ordering, `limit`, full cursor pagination with no duplicates/no gaps; `limit > 20` → 400.
3. Idempotent like: two calls → same `likesCount`; 401 without token; 404 missing post.
4. Idempotent unlike: two calls → consistent, never negative.
5. Comments: creation updates `commentsCount`; empty/>500 → 400; missing post → 404; `likedByMe` reflects the token's user.

### Mobile (manual — documented in the README)
1. Login with `ada@ivory.test` → token stored and feed loaded.
2. Like/unlike → UI and count update, no uncontrolled double tap, rollback on error.
3. Comment → list and `commentsCount` updated.
4. Empty comment → visible error message, no API call.
5. Load more → additional posts with no duplicates.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Wrong URL emulator/device | single `config.ts` + table in the README (10.0.2.2 / localhost / IP) |
| Double tap on like | per-post `pending` flag disables the button |
| likesCount drift | count derived from `Set.size`, never incremented |
| Duplicates on load more | dedupe by `id` when concatenating pages |
| Data lost on restart | accepted (in memory); documented as an improvement |
