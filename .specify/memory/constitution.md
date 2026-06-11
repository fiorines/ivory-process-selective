# Constitution — Ivory Mini Feed (React Native + Backend)

## Princípios do Projeto

### 1. Stack exigida pelo teste técnico

**Escolha:** Backend em Node.js + TypeScript (Express). Mobile em React Native + TypeScript com Expo.

**Justificativa:**
- O enunciado do teste exige explicitamente Node.js + TypeScript no backend e React Native + TypeScript no mobile, "preferibilmente Expo".
- Express é o framework HTTP mais consolidado do ecossistema Node, com tipagem madura (`@types/express`).
- Expo elimina configuração nativa (Xcode/Android Studio) e permite rodar via Expo Go, emulador Android ou simulador iOS.

### 2. Armazenamento em memória (sem banco de dados)

**Escolha:** Estruturas de dados em memória (Maps/arrays) com seed determinístico no boot.

**Justificativa:**
- O teste é um "task reale semplificato" com 5–6 horas de trabalho recomendadas; um banco real adicionaria custo de setup sem agregar ao que é avaliado (endpoints corretos, idempotência, erros, modelo de dados).
- Seed determinístico garante que os testes automatizados e os exemplos de `curl` do enunciado funcionem sempre.
- Trade-off aceito: dados são perdidos ao reiniciar — documentado no README como melhoria futura (DB real + migrations).

### 3. Autenticação mock por Bearer token

**Escolha:** Login mock por e-mail que retorna `accessToken` no formato `mock-token-<userId>`; middleware valida `Authorization: Bearer <token>`.

**Justificativa:**
- O enunciado pede "login mock via email" e os exemplos de `curl` usam `Bearer mock-token-user-1` — o formato do token segue exatamente a guia oficial do teste.
- Sem JWT/criptografia real: não é objeto de avaliação e não há segredos no repositório (requisito do checklist de entrega).

### 4. Idempotência de like/unlike

**Escolha:** Likes modelados como `Set<userId>` por post.

**Justificativa:**
- `Set.add`/`Set.delete` são naturalmente idempotentes: chamada dupla de like não duplica, chamada dupla de unlike permanece coerente — requisito central do teste.
- `likesCount` é derivado (`set.size`), nunca um contador incrementado, eliminando qualquer possibilidade de drift.

### 5. Paginação por cursor

**Escolha:** Cursor opaco (base64 de `createdAt|id`) sobre feed ordenada por `createdAt` decrescente, `limit` padrão 10 e máximo 20.

**Justificativa:**
- O enunciado exige cursor pagination com `limit` máximo 20.
- Cursor composto (`createdAt` + `id` como desempate) evita itens pulados ou duplicados entre páginas — verificado em teste automatizado.

### 6. Estado e UI no mobile

**Escolha:** React Context para autenticação (token persistido em AsyncStorage), estado local por tela, `FlatList` com "Load more", optimistic update com rollback no like.

**Justificativa:**
- O escopo não justifica Redux/React Query; Context + hooks mantêm o código legível e a separação de responsabilidades clara (api client / contexto / telas / componentes).
- O enunciado lista explicitamente os estados exigidos: loading do feed, erro do feed, feed vazia, pending durante like/comentário — todos modelados de forma explícita.
- Optimistic update com rollback é o "extra" sugerido no enunciado e foi implementado.

## Padrões de Qualidade

- TypeScript estrito (`strict: true`) no backend e no mobile
- Validação de entrada com Zod no backend (e-mail válido, comentário não vazio ≤ 500 chars)
- Erros HTTP semânticos: 400 validação, 401 sem token, 404 recurso inexistente
- Respostas de erro padronizadas: `{ "error": { "code", "message" } }`
- Testes automatizados do backend com Vitest + Supertest (≥ 5)
- Casos de teste manuais do mobile documentados no README (≥ 4)
- Sem `node_modules` e sem segredos no repositório

## Governança

- Specs em `.specify/specs/mini-feed/` são a fonte da verdade dos requisitos
- Commits seguem Conventional Commits (feat:, fix:, docs:, test:)
- Entrega em até 24h da recepção do e-mail; pendências documentadas no README
