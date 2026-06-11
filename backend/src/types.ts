export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  /** Likes as a Set of userIds: add/delete are idempotent by construction. */
  likedBy: Set<string>;
  comments: Comment[];
}

export interface FeedItem {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface LikeResponse {
  postId: string;
  likedByMe: boolean;
  likesCount: number;
}

export interface CommentsResponse {
  items: Comment[];
  commentsCount: number;
}

export interface CreateCommentResponse {
  comment: Comment;
  commentsCount: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
