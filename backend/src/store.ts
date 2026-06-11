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
  'Welcome to the Ivory mini feed! First seed post.',
  'Cursor pagination is more stable than offset when new posts keep arriving.',
  'TypeScript tip: enable strict mode from day one.',
  'Idempotency: repeating the same request must produce the same state.',
  'Expo makes React Native development much easier - no Xcode/Android Studio setup.',
  'Today I studied optimistic updates with rollback. Instant UI, guaranteed consistency.',
  'Helmet + CORS configured: the security basics of an HTTP API.',
  'Zod validates input at the API boundary and the types flow through the rest of the code.',
  'FlatList with onEndReached is the idiomatic way to do infinite scroll in RN.',
  'Tests with Vitest + Supertest run fast and need no real server.',
  'AsyncStorage keeps the mock token: the session survives closing the app.',
  'Last seed post: use Load more to navigate all the way here!',
];

/** Fixed base for deterministic timestamps (post-12 is the most recent). */
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

  // Initial likes (varied counts on the first feed page)
  store.posts.get('post-12')!.likedBy.add('user-2');
  store.posts.get('post-12')!.likedBy.add('user-3');
  store.posts.get('post-11')!.likedBy.add('user-1');
  store.posts.get('post-9')!.likedBy.add('user-2');

  // Initial comments
  addComment('post-12', 'user-2', 'Great post to open the feed!');
  addComment('post-12', 'user-3', 'Agreed, very useful.');
  addComment('post-10', 'user-1', 'Vitest really is fast.');
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

/** Mock login always works: unknown emails create a new user on the fly. */
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

/** Posts ordered by createdAt DESC, tie-broken by id DESC (stable total order). */
export function listPostsSorted(): Post[] {
  return [...store.posts.values()].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

export function addComment(postId: string, authorId: string, body: string): Comment {
  const post = store.posts.get(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

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
