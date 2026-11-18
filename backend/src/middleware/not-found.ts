import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/http-error';

/** Never echo the request URL: query strings can contain tokens or PII. */
export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'Requested API route was not found', undefined, 'ROUTE_NOT_FOUND'));
}
