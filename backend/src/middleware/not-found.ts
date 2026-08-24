import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/http-error';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} was not found`, undefined, 'ROUTE_NOT_FOUND'));
}
