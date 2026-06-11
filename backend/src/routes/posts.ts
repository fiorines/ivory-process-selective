import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { addComment, getPost } from '../store.js';
import type { CommentsResponse, CreateCommentResponse, LikeResponse, Post } from '../types.js';

const MAX_COMMENT_LENGTH = 500;

const createCommentSchema = z.object({
  body: z.string({ message: 'body is required.' }),
});

function postNotFound(res: Response, postId: string): void {
  res.status(404).json({
    error: { code: 'POST_NOT_FOUND', message: `Post '${postId}' does not exist.` },
  });
}

function likeResponse(post: Post, userId: string): LikeResponse {
  return {
    postId: post.id,
    likedByMe: post.likedBy.has(userId),
    likesCount: post.likedBy.size,
  };
}

export const postsRouter = Router();

/** POST /v1/posts/:postId/like — protected, idempotent (Set.add). */
postsRouter.post('/:postId/like', requireAuth, (req: AuthedRequest, res) => {
  const postId = String(req.params.postId);
  const post = getPost(postId);
  if (!post) {
    postNotFound(res, postId);
    return;
  }

  post.likedBy.add(req.userId!);
  res.json(likeResponse(post, req.userId!));
});

/** DELETE /v1/posts/:postId/like — protected, idempotent (Set.delete). */
postsRouter.delete('/:postId/like', requireAuth, (req: AuthedRequest, res) => {
  const postId = String(req.params.postId);
  const post = getPost(postId);
  if (!post) {
    postNotFound(res, postId);
    return;
  }

  post.likedBy.delete(req.userId!);
  res.json(likeResponse(post, req.userId!));
});

/** GET /v1/posts/:postId/comments — 404 when the post does not exist. */
postsRouter.get('/:postId/comments', (req, res) => {
  const postId = String(req.params.postId);
  const post = getPost(postId);
  if (!post) {
    postNotFound(res, postId);
    return;
  }

  const response: CommentsResponse = {
    items: [...post.comments].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    commentsCount: post.comments.length,
  };
  res.json(response);
});

/** POST /v1/posts/:postId/comments — protected; non-empty body, max 500 chars. */
postsRouter.post('/:postId/comments', requireAuth, (req: AuthedRequest, res) => {
  const postId = String(req.params.postId);
  const post = getPost(postId);
  if (!post) {
    postNotFound(res, postId);
    return;
  }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'INVALID_COMMENT', message: parsed.error.issues[0]?.message ?? 'invalid body.' },
    });
    return;
  }

  const body = parsed.data.body.trim();
  if (body.length === 0) {
    res.status(400).json({
      error: { code: 'INVALID_COMMENT', message: 'Comment cannot be empty.' },
    });
    return;
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    res.status(400).json({
      error: { code: 'INVALID_COMMENT', message: `Comment must be at most ${MAX_COMMENT_LENGTH} characters long.` },
    });
    return;
  }

  const comment = addComment(post.id, req.userId!, body);
  const response: CreateCommentResponse = {
    comment,
    commentsCount: post.comments.length,
  };
  res.status(201).json(response);
});
