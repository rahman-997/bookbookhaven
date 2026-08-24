import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../errors/http-error';

function validationError(error: { flatten(): unknown }) {
  return new HttpError(400, 'Invalid request data', error.flatten(), 'VALIDATION_ERROR');
}

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(validationError(result.error));
    req.body = result.data;
    next();
  };
}

export function validateParams(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) return next(validationError(result.error));
    req.params = result.data as Record<string, string>;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(validationError(result.error));
    res.locals.validatedQuery = result.data;
    next();
  };
}
