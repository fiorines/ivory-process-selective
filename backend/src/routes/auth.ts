import { Router } from 'express';
import { z } from 'zod';
import { findOrCreateUser } from '../store.js';
import type { LoginResponse } from '../types.js';

const loginSchema = z.object({
  email: z
    .string({ message: 'email é obrigatório.' })
    .trim()
    .toLowerCase()
    .email('email inválido.'),
});

export const authRouter = Router();

/** POST /v1/auth/login — login mock via e-mail; retorna accessToken + user. */
authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'INVALID_EMAIL', message: parsed.error.issues[0]?.message ?? 'email inválido.' },
    });
    return;
  }

  const user = findOrCreateUser(parsed.data.email);
  const response: LoginResponse = {
    accessToken: `mock-token-${user.id}`,
    user,
  };
  res.json(response);
});
