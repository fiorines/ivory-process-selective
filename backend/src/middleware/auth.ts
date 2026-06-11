import type { NextFunction, Request, Response } from 'express';
import { getUserById } from '../store.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Mock token in the format `mock-token-<userId>` (e.g. `Bearer mock-token-user-1`),
 * exactly as in the curl examples of the test guide.
 */
function extractUserId(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authorizationHeader);
  if (!bearerMatch) return null;

  const tokenMatch = /^mock-token-(.+)$/.exec(bearerMatch[1]!.trim());
  if (!tokenMatch) return null;

  const userId = tokenMatch[1]!;
  return getUserById(userId) ? userId : null;
}

/** Protected routes: 401 when the token is missing or invalid. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const userId = extractUserId(req.header('authorization'));
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token. Use: Authorization: Bearer mock-token-<userId>.' },
    });
    return;
  }
  req.userId = userId;
  next();
}

/** Feed: optional auth — with a valid token, likedByMe reflects the user; without one, false. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const userId = extractUserId(req.header('authorization'));
  if (userId) req.userId = userId;
  next();
}
