import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id')?.slice(0, 128) || randomUUID();
  res.setHeader('x-request-id', requestId);
  res.locals.requestId = requestId;
  const started = performance.now();

  res.on('finish', () => {
    if (env.NODE_ENV === 'test') return;
    const durationMs = Math.round((performance.now() - started) * 10) / 10;
    console.log(JSON.stringify({ level: 'info', requestId, method: req.method, path: req.originalUrl, status: res.statusCode, durationMs }));
  });
  next();
}
