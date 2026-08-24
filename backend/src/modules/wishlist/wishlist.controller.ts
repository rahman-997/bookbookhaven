import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.middleware';
import * as service from './wishlist.service';

export async function get(req: AuthRequest, res: Response) {
  const data = await service.getWishlist(req.auth!.userId);
  res.json({ success: true, data });
}

export async function add(req: AuthRequest<{ bookId: string }>, res: Response) {
  const data = await service.add(req.auth!.userId, req.params.bookId);
  res.status(201).json({ success: true, data });
}

export async function remove(req: AuthRequest<{ bookId: string }>, res: Response) {
  const data = await service.remove(req.auth!.userId, req.params.bookId);
  res.json({ success: true, data });
}
