import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.middleware';
import * as service from './cart.service';

export async function get(req: AuthRequest, res: Response) {
  res.json({ success: true, data: await service.getCart(req.auth!.userId) });
}

export async function add(req: AuthRequest, res: Response) {
  const data = await service.addItem(req.auth!.userId, req.body.bookId, req.body.quantity);
  res.status(201).json({ success: true, data });
}

export async function update(req: AuthRequest<{ bookId: string }>, res: Response) {
  const data = await service.updateItem(req.auth!.userId, req.params.bookId!, req.body.quantity);
  res.json({ success: true, data });
}

export async function remove(req: AuthRequest<{ bookId: string }>, res: Response) {
  const data = await service.removeItem(req.auth!.userId, req.params.bookId!);
  res.json({ success: true, data });
}

export async function clear(req: AuthRequest, res: Response) {
  await service.clear(req.auth!.userId);
  res.status(204).send();
}
