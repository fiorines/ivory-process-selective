import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, type AuthedRequest } from '../middleware/auth.js';
import { listPostsSorted } from '../store.js';
import type { FeedItem, FeedResponse, Post } from '../types.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

const querySchema = z.object({
  limit: z.coerce
    .number({ message: 'limit deve ser um número.' })
    .int('limit deve ser inteiro.')
    .min(1, 'limit mínimo é 1.')
    .max(MAX_LIMIT, `limit máximo é ${MAX_LIMIT}.`)
    .default(DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

interface CursorPayload {
  createdAt: string;
  id: string;
}

/** Cursor opaco: base64url de `createdAt|id` do último item da página anterior. */
function encodeCursor(post: Post): string {
  return Buffer.from(`${post.createdAt}|${post.id}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separatorIndex = decoded.lastIndexOf('|');
    if (separatorIndex <= 0) return null;

    const createdAt = decoded.slice(0, separatorIndex);
    const id = decoded.slice(separatorIndex + 1);
    if (!id || Number.isNaN(Date.parse(createdAt))) return null;

    return { createdAt, id };
  } catch {
    return null;
  }
}

/** true se `post` vem estritamente depois do cursor na ordenação DESC (createdAt, id). */
function isAfterCursor(post: Post, cursor: CursorPayload): boolean {
  if (post.createdAt !== cursor.createdAt) return post.createdAt < cursor.createdAt;
  return post.id < cursor.id;
}

export const feedRouter = Router();

/** GET /v1/feed?limit=3&cursor=... — feed ordenada com cursor pagination. */
feedRouter.get('/', optionalAuth, (req: AuthedRequest, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'INVALID_QUERY', message: parsed.error.issues[0]?.message ?? 'Query inválida.' },
    });
    return;
  }

  const { limit, cursor } = parsed.data;

  let posts = listPostsSorted();
  if (cursor !== undefined) {
    const payload = decodeCursor(cursor);
    if (!payload) {
      res.status(400).json({
        error: { code: 'INVALID_CURSOR', message: 'cursor malformado.' },
      });
      return;
    }
    posts = posts.filter((post) => isAfterCursor(post, payload));
  }

  const page = posts.slice(0, limit);
  const hasMore = posts.length > limit;
  const lastItem = page[page.length - 1];

  const items: FeedItem[] = page.map((post) => ({
    id: post.id,
    authorId: post.authorId,
    body: post.body,
    createdAt: post.createdAt,
    likesCount: post.likedBy.size,
    commentsCount: post.comments.length,
    likedByMe: req.userId ? post.likedBy.has(req.userId) : false,
  }));

  const response: FeedResponse = {
    items,
    nextCursor: hasMore && lastItem ? encodeCursor(lastItem) : null,
  };
  res.json(response);
});
