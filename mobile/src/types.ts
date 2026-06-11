export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
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

export interface LikeResponse {
  postId: string;
  likedByMe: boolean;
  likesCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface CommentsResponse {
  items: Comment[];
  commentsCount: number;
}

export interface CreateCommentResponse {
  comment: Comment;
  commentsCount: number;
}
