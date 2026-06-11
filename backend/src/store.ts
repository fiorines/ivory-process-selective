import { v4 as uuidv4 } from 'uuid';
import type { Comment, Post, User } from './types.js';

interface Store {
  users: Map<string, User>;
  usersByEmail: Map<string, User>;
  posts: Map<string, Post>;
}

const store: Store = {
  users: new Map(),
  usersByEmail: new Map(),
  posts: new Map(),
};

const SEED_USERS: User[] = [
  { id: 'user-1', email: 'ada@ivory.test', name: 'Ada Lovelace' },
  { id: 'user-2', email: 'bruno@ivory.test', name: 'Bruno Rossi' },
  { id: 'user-3', email: 'carla@ivory.test', name: 'Carla Bianchi' },
];

const POST_BODIES = [
  'Benvenuti nel mini feed Ivory! Primo post di prova.',
  'Cursor pagination é mais estável que offset quando o feed recebe novos posts.',
  'Dica TypeScript: habilite strict mode desde o primeiro dia.',
  'Idempotência: a mesma requisição repetida deve produzir o mesmo estado.',
  'Expo facilita muito o desenvolvimento React Native sem configurar Xcode/Android Studio.',
  'Hoje estudei optimistic updates com rollback. UI instantânea, consistência garantida.',
  'Helmet + CORS configurados: o básico de segurança de uma API HTTP.',
  'Zod valida o input na borda da API e os tipos fluem para o resto do código.',
  'FlatList com onEndReached é a forma idiomática de fazer infinite scroll em RN.',
  'Testes com Vitest + Supertest rodam rápido e não precisam de servidor real.',
  'AsyncStorage guarda o token mock: sessão sobrevive ao fechar o app.',
  'Último post do seed: use o Load more para navegar até aqui!',
];

/** Base fixa para timestamps determinísticos (post-12 é o mais recente). */
const SEED_BASE_TIME = Date.UTC(2026, 5, 9, 12, 0, 0); // 2026-06-09T12:00:00Z

function seed(): void {
  store.users.clear();
  store.usersByEmail.clear();
  store.posts.clear();

  for (const user of SEED_USERS) {
    store.users.set(user.id, user);
    store.usersByEmail.set(user.email, user);
  }

  POST_BODIES.forEach((body, index) => {
    const postNumber = index + 1;
    const post: Post = {
      id: `post-${postNumber}`,
      authorId: SEED_USERS[index % SEED_USERS.length]!.id,
      body,
      createdAt: new Date(SEED_BASE_TIME + postNumber * 60_000).toISOString(),
      likedBy: new Set(),
      comments: [],
    };
    store.posts.set(post.id, post);
  });

  // Likes iniciais (counts variados na primeira página do feed)
  store.posts.get('post-12')!.likedBy.add('user-2');
  store.posts.get('post-12')!.likedBy.add('user-3');
  store.posts.get('post-11')!.likedBy.add('user-1');
  store.posts.get('post-9')!.likedBy.add('user-2');

  // Comentários iniciais
  addComment('post-12', 'user-2', 'Ótimo post para abrir o feed!');
  addComment('post-12', 'user-3', 'Concordo, muito útil.');
  addComment('post-10', 'user-1', 'Vitest é realmente rápido.');
}

export function resetStore(): void {
  seed();
}

export function getUserById(userId: string): User | undefined {
  return store.users.get(userId);
}

export function getUserByEmail(email: string): User | undefined {
  return store.usersByEmail.get(email);
}

/** Login mock sempre funciona: e-mails desconhecidos criam um novo usuário. */
export function findOrCreateUser(email: string): User {
  const existing = store.usersByEmail.get(email);
  if (existing) return existing;

  const localPart = email.split('@')[0] ?? 'user';
  const user: User = {
    id: `user-${uuidv4()}`,
    email,
    name: localPart.charAt(0).toUpperCase() + localPart.slice(1),
  };
  store.users.set(user.id, user);
  store.usersByEmail.set(user.email, user);
  return user;
}

export function getPost(postId: string): Post | undefined {
  return store.posts.get(postId);
}

/** Posts ordenados por createdAt DESC, desempate por id DESC (ordem total estável). */
export function listPostsSorted(): Post[] {
  return [...store.posts.values()].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

export function addComment(postId: string, authorId: string, body: string): Comment {
  const post = store.posts.get(postId);
  if (!post) throw new Error(`Post inexistente: ${postId}`);

  const comment: Comment = {
    id: uuidv4(),
    postId,
    authorId,
    body,
    createdAt: new Date().toISOString(),
  };
  post.comments.push(comment);
  return comment;
}

seed();
