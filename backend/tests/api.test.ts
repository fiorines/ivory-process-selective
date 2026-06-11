import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { resetStore } from '../src/store.js';
import type { FeedItem, FeedResponse } from '../src/types.js';

const app = createApp();
const ADA_TOKEN = 'mock-token-user-1';
const TOTAL_SEED_POSTS = 12;

beforeEach(() => {
  resetStore();
});

describe('POST /v1/auth/login', () => {
  it('faz login mock com e-mail e retorna accessToken + user (Teste 1)', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'ada@ivory.test' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('mock-token-user-1');
    expect(res.body.user).toMatchObject({ id: 'user-1', email: 'ada@ivory.test' });
  });

  it('retorna 400 para e-mail inválido ou ausente', async () => {
    const invalid = await request(app).post('/v1/auth/login').send({ email: 'nao-e-email' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_EMAIL');

    const missing = await request(app).post('/v1/auth/login').send({});
    expect(missing.status).toBe(400);
  });

  it('cria usuário mock para e-mail desconhecido (login sempre funciona)', async () => {
    const res = await request(app).post('/v1/auth/login').send({ email: 'novo@ivory.test' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe(`mock-token-${res.body.user.id}`);
  });
});

describe('GET /v1/feed', () => {
  it('retorna feed ordenada (mais recente primeiro) com os campos exigidos (Teste 2)', async () => {
    const res = await request(app).get('/v1/feed?limit=3');

    expect(res.status).toBe(200);
    const body = res.body as FeedResponse;
    expect(body.items).toHaveLength(3);
    expect(body.nextCursor).not.toBeNull();

    // post-12 é o mais recente do seed
    expect(body.items[0]).toMatchObject({
      id: 'post-12',
      likesCount: 2,
      commentsCount: 2,
      likedByMe: false,
    });
    for (const item of body.items) {
      expect(item).toHaveProperty('authorId');
      expect(item).toHaveProperty('body');
      expect(item).toHaveProperty('createdAt');
    }

    const dates = body.items.map((i) => i.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('pagina por cursor até o fim sem duplicados e sem buracos', async () => {
    const seen: FeedItem[] = [];
    let cursor: string | null = null;
    let pages = 0;

    do {
      const url: string = cursor ? `/v1/feed?limit=5&cursor=${cursor}` : '/v1/feed?limit=5';
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      const body = res.body as FeedResponse;
      seen.push(...body.items);
      cursor = body.nextCursor;
      pages += 1;
    } while (cursor !== null && pages < 10);

    expect(seen).toHaveLength(TOTAL_SEED_POSTS);
    expect(new Set(seen.map((p) => p.id)).size).toBe(TOTAL_SEED_POSTS);
  });

  it('rejeita limit acima de 20 e cursor malformado com 400', async () => {
    const tooBig = await request(app).get('/v1/feed?limit=21');
    expect(tooBig.status).toBe(400);

    const badCursor = await request(app).get('/v1/feed?cursor=%%%notbase64');
    expect(badCursor.status).toBe(400);
    expect(badCursor.body.error.code).toBe('INVALID_CURSOR');
  });

  it('likedByMe reflete o usuário autenticado', async () => {
    // seed: user-1 curtiu post-11
    const res = await request(app)
      .get('/v1/feed?limit=5')
      .set('Authorization', `Bearer ${ADA_TOKEN}`);

    expect(res.status).toBe(200);
    const post11 = (res.body as FeedResponse).items.find((i) => i.id === 'post-11');
    const post12 = (res.body as FeedResponse).items.find((i) => i.id === 'post-12');
    expect(post11?.likedByMe).toBe(true);
    expect(post12?.likedByMe).toBe(false);
  });
});

describe('POST /v1/posts/:postId/like', () => {
  it('é idempotente: chamada dupla não duplica o like (Teste 3)', async () => {
    const first = await request(app)
      .post('/v1/posts/post-1/like')
      .set('Authorization', `Bearer ${ADA_TOKEN}`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ postId: 'post-1', likedByMe: true, likesCount: 1 });

    const second = await request(app)
      .post('/v1/posts/post-1/like')
      .set('Authorization', `Bearer ${ADA_TOKEN}`);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ postId: 'post-1', likedByMe: true, likesCount: 1 });
  });

  it('exige autenticação (401) e retorna 404 para post inexistente', async () => {
    const noToken = await request(app).post('/v1/posts/post-1/like');
    expect(noToken.status).toBe(401);

    const badToken = await request(app)
      .post('/v1/posts/post-1/like')
      .set('Authorization', 'Bearer token-qualquer');
    expect(badToken.status).toBe(401);

    const notFound = await request(app)
      .post('/v1/posts/post-999/like')
      .set('Authorization', `Bearer ${ADA_TOKEN}`);
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('POST_NOT_FOUND');
  });
});

describe('DELETE /v1/posts/:postId/like', () => {
  it('é idempotente: chamada dupla permanece coerente, nunca negativa (Teste 4)', async () => {
    await request(app).post('/v1/posts/post-1/like').set('Authorization', `Bearer ${ADA_TOKEN}`);

    const first = await request(app)
      .delete('/v1/posts/post-1/like')
      .set('Authorization', `Bearer ${ADA_TOKEN}`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ postId: 'post-1', likedByMe: false, likesCount: 0 });

    const second = await request(app)
      .delete('/v1/posts/post-1/like')
      .set('Authorization', `Bearer ${ADA_TOKEN}`);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ postId: 'post-1', likedByMe: false, likesCount: 0 });
  });

  it('não remove o like de outros usuários', async () => {
    // seed: post-12 tem likes de user-2 e user-3
    const res = await request(app)
      .delete('/v1/posts/post-12/like')
      .set('Authorization', `Bearer ${ADA_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.likesCount).toBe(2);
  });
});

describe('GET/POST /v1/posts/:postId/comments', () => {
  it('cria comentário e atualiza commentsCount (Teste 5)', async () => {
    const created = await request(app)
      .post('/v1/posts/post-1/comments')
      .set('Authorization', `Bearer ${ADA_TOKEN}`)
      .send({ body: 'Primeiro comentário!' });

    expect(created.status).toBe(201);
    expect(created.body.comment).toMatchObject({
      postId: 'post-1',
      authorId: 'user-1',
      body: 'Primeiro comentário!',
    });
    expect(created.body.commentsCount).toBe(1);

    const list = await request(app).get('/v1/posts/post-1/comments');
    expect(list.status).toBe(200);
    expect(list.body.commentsCount).toBe(1);
    expect(list.body.items[0].body).toBe('Primeiro comentário!');
  });

  it('rejeita comentário vazio e acima de 500 caracteres com 400', async () => {
    const empty = await request(app)
      .post('/v1/posts/post-1/comments')
      .set('Authorization', `Bearer ${ADA_TOKEN}`)
      .send({ body: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('INVALID_COMMENT');

    const tooLong = await request(app)
      .post('/v1/posts/post-1/comments')
      .set('Authorization', `Bearer ${ADA_TOKEN}`)
      .send({ body: 'a'.repeat(501) });
    expect(tooLong.status).toBe(400);
  });

  it('retorna 404 para post inexistente (GET e POST) e 401 sem token no POST', async () => {
    const getMissing = await request(app).get('/v1/posts/post-999/comments');
    expect(getMissing.status).toBe(404);

    const postMissing = await request(app)
      .post('/v1/posts/post-999/comments')
      .set('Authorization', `Bearer ${ADA_TOKEN}`)
      .send({ body: 'olá' });
    expect(postMissing.status).toBe(404);

    const noToken = await request(app)
      .post('/v1/posts/post-1/comments')
      .send({ body: 'olá' });
    expect(noToken.status).toBe(401);
  });
});
