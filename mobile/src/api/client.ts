import { API_BASE_URL } from './config';
import type {
  CommentsResponse,
  CreateCommentResponse,
  FeedResponse,
  LikeResponse,
  LoginResponse,
} from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  token?: string | null;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Could not reach the backend. Check that it is running and that API_BASE_URL is correct for your emulator/device.',
      0,
      'NETWORK_ERROR',
    );
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string } })
    | null;

  if (!response.ok) {
    const message = data?.error?.message ?? `HTTP error ${response.status}`;
    const code = data?.error?.code ?? 'UNKNOWN_ERROR';
    throw new ApiError(message, response.status, code);
  }

  return data as T;
}

export const api = {
  login(email: string): Promise<LoginResponse> {
    return request('/v1/auth/login', { method: 'POST', body: { email } });
  },

  getFeed(token: string | null, limit: number, cursor: string | null): Promise<FeedResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return request(`/v1/feed?${params.toString()}`, { token });
  },

  likePost(token: string, postId: string): Promise<LikeResponse> {
    return request(`/v1/posts/${postId}/like`, { method: 'POST', token });
  },

  unlikePost(token: string, postId: string): Promise<LikeResponse> {
    return request(`/v1/posts/${postId}/like`, { method: 'DELETE', token });
  },

  getComments(postId: string): Promise<CommentsResponse> {
    return request(`/v1/posts/${postId}/comments`);
  },

  createComment(token: string, postId: string, body: string): Promise<CreateCommentResponse> {
    return request(`/v1/posts/${postId}/comments`, { method: 'POST', token, body: { body } });
  },
};
