import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth/auth.middleware';
import * as service from './review.service';

export async function list(req: Request<{ bookId: string }>, res: Response) {
  const result = await service.listForBook(req.params.bookId, res.locals.validatedQuery);
  res.json({ success: true, data: result.reviews, meta: { ...result.summary, pagination: result.pagination } });
}

export async function upsert(req: AuthRequest<{ bookId: string }>, res: Response) {
  const review = await service.upsert(req.auth!.userId, req.params.bookId, req.body);
  res.status(201).json({ success: true, data: review });
}

export async function remove(req: AuthRequest<{ id: string }>, res: Response) {
  await service.remove(req.auth!.userId, req.auth!.role, req.params.id);
  res.status(204).send();
}
