import type { Request, Response } from 'express';
import * as service from './book.service';

export async function list(req: Request, res: Response) {
  const result = await service.list(res.locals.validatedQuery);
  res.json({ success: true, data: result.items, meta: result.pagination });
}

export async function facets(_req: Request, res: Response) {
  const data = await service.facets();
  res.json({ success: true, data });
}

export async function get(req: Request<{ id: string }>, res: Response) {
  const book = await service.getById(req.params.id!);
  res.json({ success: true, data: book });
}

export async function getBySlug(req: Request<{ slug: string }>, res: Response) {
  const book = await service.getBySlug(req.params.slug);
  res.json({ success: true, data: book });
}

export async function create(req: Request, res: Response) {
  const book = await service.create(req.body);
  res.status(201).json({ success: true, data: book });
}

export async function update(req: Request<{ id: string }>, res: Response) {
  const book = await service.update(req.params.id!, req.body);
  res.json({ success: true, data: book });
}

export async function remove(req: Request<{ id: string }>, res: Response) {
  await service.remove(req.params.id!);
  res.status(204).send();
}
