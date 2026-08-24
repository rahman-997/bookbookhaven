import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.middleware';
import { stats } from './admin.service';

export async function getStats(_req: AuthRequest, res: Response) {
  res.json({ success: true, data: await stats() });
}
