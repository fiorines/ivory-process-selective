import type { NextFunction, Request, Response } from 'express';
import { getUserById } from '../store.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Token mock no formato `mock-token-<userId>` (ex.: `Bearer mock-token-user-1`),
 * exatamente como nos exemplos de curl da guia do teste.
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

/** Rotas protegidas: 401 se o token estiver ausente ou for inválido. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const userId = extractUserId(req.header('authorization'));
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token ausente ou inválido. Use: Authorization: Bearer mock-token-<userId>.' },
    });
    return;
  }
  req.userId = userId;
  next();
}

/** Feed: auth opcional — com token válido, likedByMe reflete o usuário; sem token, false. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const userId = extractUserId(req.header('authorization'));
  if (userId) req.userId = userId;
  next();
}
