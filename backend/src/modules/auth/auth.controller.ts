import type { Request, Response } from 'express';
import type { AuthRequest } from './auth.middleware';
import * as authService from './auth.service';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await authService.getUserById(req.auth!.userId);
  res.json({ success: true, data: user });
}
