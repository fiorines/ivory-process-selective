# Ivory Mini Feed — React Native + Backend

Teste técnico Ivory: mini aplicação com **backend API (Node.js + TypeScript + Express)** e **app mobile (React Native + TypeScript com Expo)** realmente conectado ao backend.

Funcionalidades: login mock, feed paginada por cursor, like/unlike idempotente, comentários e estados de UI (loading / error / empty / pending).

## Estrutura

```
ivory-process-seletive/
├── backend/        # API Express + TypeScript (dados em memória)
├── mobile/         # App Expo (blank-typescript)
├── .specify/       # Artefatos SPEC-DRIVEN (constitution, spec, plan, tasks)
└── README.md
```

> O projeto foi desenvolvido com a metodologia **spec-driven (GitHub spec-kit)**: requisitos, plano técnico e tarefas estão em `.specify/specs/mini-feed/`.

## Instalação

Pré-requisitos: **Node.js 20+** (testado com Node 26), npm, e **Expo Go** no celular ou um emulador Android / simulador iOS.

```bash
# Backend
cd backend
npm install

# Mobile
cd ../mobile
npm install
```

## Avvio / Como rodar

### 1. Backend (porta 3000)

```bash
cd backend
npm run dev      # tsx watch (ou: npm start)
```

O servidor escuta em `0.0.0.0:3000` (acessível pelo emulador e por devices na rede local).
Healthcheck: `GET http://localhost:3000/health`.

### 2. App React Native

**Antes de abrir o app**, ajuste a URL do backend em [`mobile/src/api/config.ts`](mobile/src/api/config.ts):

| Ambiente                    | `API_BASE_URL`                          |
|-----------------------------|------------------------------------------|
| Android Emulator            | `http://10.0.2.2:3000` (padrão atual)    |
| iOS Simulator (macOS)       | `http://localhost:3000`                  |
| Expo Go / device físico     | `http://<IP-local-do-computador>:3000` (ex.: `http://192.168.1.50:3000` — descubra com `ipconfig`/`ifconfig`; PC e celular na mesma rede Wi-Fi) |

```bash
cd mobile
npx expo start
```

Abra com **Expo Go** (QR code), tecla `a` (emulador Android) ou `i` (simulador iOS).

### 3. Login

Use `ada@ivory.test` (ou `bruno@ivory.test`, `carla@ivory.test`). Qualquer e-mail válido também funciona — o login mock cria o usuário na hora.

## API

| Método | Endpoint                      | Auth            | Descrição |
|--------|-------------------------------|-----------------|-----------|
| POST   | `/v1/auth/login`              | —               | Login mock via e-mail. Retorna `accessToken` (`mock-token-<userId>`) e `user`. |
| GET    | `/v1/feed?limit=3&cursor=...` | opcional        | Feed ordenada (mais recente primeiro), cursor pagination, `limit` máx 20. Itens com `likedByMe`, `likesCount`, `commentsCount`. |
| POST   | `/v1/posts/:postId/like`      | Bearer          | Like **idempotente** (chamada dupla não duplica). 404 se post inexistente. |
| DELETE | `/v1/posts/:postId/like`      | Bearer          | Unlike **idempotente** (chamada dupla permanece coerente). |
| GET    | `/v1/posts/:postId/comments`  | —               | Lista comentários. 404 se post inexistente. |
| POST   | `/v1/posts/:postId/comments`  | Bearer          | Cria comentário (não vazio, máx 500 chars). Retorna `comment` + `commentsCount`. |

Erros padronizados: `{ "error": { "code": "...", "message": "..." } }` — `400` validação, `401` sem token, `404` recurso inexistente.

### Curl essenciais

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@ivory.test"}'

curl "http://localhost:3000/v1/feed?limit=3"

curl -X POST http://localhost:3000/v1/posts/post-1/like \
  -H "Authorization: Bearer mock-token-user-1"
```

## Testes

### Backend — automatizados (Vitest + Supertest)

```bash
cd backend
npm test
```

**14 testes** cobrindo:

1. **Login mock** — retorna `accessToken` + `user`; 400 para e-mail inválido/ausente; e-mail desconhecido cria usuário.
2. **Feed** — ordenação decrescente, campos exigidos, paginação completa por cursor sem duplicados/sem buracos, 400 para `limit > 20` e cursor malformado, `likedByMe` refletindo o token.
3. **Like idempotente** — chamada dupla mantém `likesCount`; 401 sem token; 404 post inexistente.
4. **Unlike idempotente** — chamada dupla coerente, nunca negativa; não afeta likes de outros usuários.
5. **Comentários** — criação atualiza `commentsCount`; 400 para vazio e > 500 chars; 404 post inexistente; 401 sem token.

### Mobile — casos manuais documentados

| # | Caso | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 1 | **Login + feed** | Abrir o app, entrar com `ada@ivory.test` | Token obtido e salvo (AsyncStorage); feed carrega a primeira página com spinner durante o load |
| 2 | **Like/unlike** | Tocar no ♡ de um post; tocar de novo | UI e count atualizam imediatamente (optimistic update); botão fica pending (sem duplo tap); em erro de API, rollback + banner de erro |
| 3 | **Comentário** | Abrir 💬 de um post, escrever e enviar | Comentário aparece na lista e o `commentsCount` do feed atualiza |
| 4 | **Erro comentário vazio** | Abrir 💬, enviar comentário vazio/só espaços | Mensagem "O comentário não pode ser vazio." visível; nenhuma chamada à API |
| 5 | **Load more** | Rolar até o fim / tocar em "Load more" | Próxima página é anexada sem posts duplicados; ao fim, mensagem "Você chegou ao fim da feed." |

Extras verificáveis: pull-to-refresh recarrega a feed; logout volta ao login; fechar e reabrir o app mantém a sessão; backend desligado mostra erro de feed com botão "Tentar novamente".

## Scelte tecniche (escolhas técnicas)

- **Express 5 + Zod** — validação na borda da API (e-mail, `limit` 1..20, cursor, comentário 1..500 chars) com erros HTTP semânticos e payload padronizado.
- **Dados em memória com seed determinístico** — 3 usuários, 12 posts, likes e comentários iniciais. Sem banco: o foco do teste é endpoints corretos, idempotência e integração. `resetStore()` isola cada teste automatizado.
- **Idempotência por construção** — likes são um `Set<userId>` por post; `likesCount` é derivado (`set.size`), nunca um contador incrementado. Like/unlike duplos não causam drift.
- **Cursor pagination** — cursor opaco `base64url(createdAt|id)` sobre ordenação `createdAt DESC, id DESC`; o desempate por `id` garante páginas sem buracos nem duplicados.
- **Token mock `mock-token-<userId>`** — exatamente o formato dos exemplos de curl da guia (`Bearer mock-token-user-1`). Sem JWT: autenticação real não é objeto do teste e não há segredos no repo.
- **Mobile sem libs de estado/navegação** — React Context para auth (token em AsyncStorage, restaurado no boot), estado local por tela, `fetch` nativo com client tipado (`ApiError`). Duas "telas" (Login/Feed) trocadas por condição + modal de comentários: escopo não justifica react-navigation/Redux.
- **Estados de UI explícitos** — loading inicial, erro com retry, feed vazia, `refreshing`, `loadingMore`, pending por post no like e pending no envio de comentário.
- **Optimistic update com rollback (extra do enunciado)** — o like atualiza a UI na hora, reconcilia com a resposta do backend e faz rollback com mensagem de erro se a chamada falhar.

## Miglioramenti (melhorias futuras)

- Banco real (PostgreSQL/SQLite) com migrations e repositórios.
- Autenticação real (JWT com expiração/refresh) e usuários com senha.
- Testes do mobile (React Native Testing Library + MSW) e E2E (Maestro/Detox).
- Paginação de comentários e contagem otimizada para feeds grandes.
- Logging estruturado (pino), rate limiting e observabilidade.
- CI (GitHub Actions): typecheck + testes em cada PR.
- Deploy do backend (Render/Fly.io) e build EAS do app.

## Uso de AI / internet (dichiarazione)

- Projeto desenvolvido com auxílio de **Claude Code (Anthropic)** como ferramenta de pair programming, seguindo a metodologia **spec-driven (GitHub spec-kit)**: os requisitos dos PDFs do teste foram convertidos em `spec.md`, `plan.md` e `tasks.md` (em `.specify/`) antes da implementação.
- Documentação oficial consultada: Expo, React Native, Express e Zod.
- Todo o código foi revisado, executado e validado localmente: 14 testes automatizados do backend passando e endpoints verificados via curl.

## Limites conhecidos

- Dados em memória: reiniciar o backend restaura o seed (likes/comentários criados são perdidos).
- `authorId` é exibido no lugar do nome do autor no feed (a API de feed não expande o autor — decisão de escopo).
- Sem testes automatizados do mobile (casos manuais documentados acima, conforme permitido pelo enunciado).
