import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.middleware';
import * as service from './order.service';

export async function listMine(req: AuthRequest, res: Response) {
  res.json({ success: true, data: await service.listForUser(req.auth!.userId) });
}

export async function getMine(req: AuthRequest<{ id: string }>, res: Response) {
  res.json({ success: true, data: await service.getForUser(req.auth!.userId, req.params.id) });
}

export async function create(req: AuthRequest, res: Response) {
  const order = await service.create(req.auth!.userId, req.body.shippingAddress, req.body.paymentMethod);
  res.status(201).json({ success: true, data: order });
}

export async function listAll(_req: AuthRequest, res: Response) {
  res.json({ success: true, data: await service.listAll() });
}

export async function updateStatus(req: AuthRequest<{ id: string }>, res: Response) {
  const order = await service.updateStatus(req.params.id, req.body.status);
  res.json({ success: true, data: order });
}
