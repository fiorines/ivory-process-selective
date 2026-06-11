# Constitution — Ivory Mini Feed (React Native + Backend)

## Project Principles

### 1. Stack required by the technical test

**Choice:** Backend in Node.js + TypeScript (Express). Mobile in React Native + TypeScript with Expo.

**Rationale:**
- The test statement explicitly requires Node.js + TypeScript on the backend and React Native + TypeScript on mobile, "preferably Expo".
- Express is the most established HTTP framework in the Node ecosystem, with mature typings (`@types/express`).
- Expo removes native configuration (Xcode/Android Studio) and allows running via Expo Go, Android emulator or iOS simulator.

### 2. In-memory storage (no database)

**Choice:** In-memory data structures (Maps/arrays) with a deterministic seed at boot.

**Rationale:**
- The test is a "simplified real task" with 5–6 recommended working hours; a real database would add setup cost without adding to what is evaluated (correct endpoints, idempotency, errors, data model).
- A deterministic seed guarantees that the automated tests and the `curl` examples from the statement always work.
- Accepted trade-off: data is lost on restart — documented in the README as a future improvement (real DB + migrations).

### 3. Mock authentication via Bearer token

**Choice:** Mock login via email returning an `accessToken` in the format `mock-token-<userId>`; a middleware validates `Authorization: Bearer <token>`.

**Rationale:**
- The statement asks for "mock login via email" and the `curl` examples use `Bearer mock-token-user-1` — the token format follows the official test guide exactly.
- No JWT/real cryptography: it is not what is being evaluated and there are no secrets in the repository (a delivery-checklist requirement).

### 4. Like/unlike idempotency

**Choice:** Likes modeled as a `Set<userId>` per post.

**Rationale:**
- `Set.add`/`Set.delete` are naturally idempotent: a double like call does not duplicate, a double unlike call stays consistent — the central requirement of the test.
- `likesCount` is derived (`set.size`), never an incremented counter, eliminating any possibility of drift.

### 5. Cursor pagination

**Choice:** Opaque cursor (base64 of `createdAt|id`) over a feed ordered by `createdAt` descending, default `limit` 10 and maximum 20.

**Rationale:**
- The statement requires cursor pagination with a maximum `limit` of 20.
- A composite cursor (`createdAt` + `id` as tie-break) avoids skipped or duplicated items between pages — verified by an automated test.

### 6. State and UI on mobile

**Choice:** React Context for authentication (token persisted in AsyncStorage), local state per screen, `FlatList` with "Load more", optimistic update with rollback on like.

**Rationale:**
- The scope does not justify Redux/React Query; Context + hooks keep the code readable and the separation of concerns clear (api client / context / screens / components).
- The statement explicitly lists the required states: feed loading, feed error, empty feed, pending during like/comment — all modeled explicitly.
- Optimistic update with rollback is the "extra" suggested in the statement and was implemented.

## Quality Standards

- Strict TypeScript (`strict: true`) on both backend and mobile
- Input validation with Zod on the backend (valid email, non-empty comment ≤ 500 chars)
- Semantic HTTP errors: 400 validation, 401 missing token, 404 missing resource
- Standardized error responses: `{ "error": { "code", "message" } }`
- Automated backend tests with Vitest + Supertest (≥ 5)
- Documented manual mobile test cases in the README (≥ 4)
- No `node_modules` and no secrets in the repository

## Governance

- Specs in `.specify/specs/mini-feed/` are the source of truth for the requirements
- Commits follow Conventional Commits (feat:, fix:, docs:, test:)
- Delivery within 24h of receiving the email; pending items documented in the README
