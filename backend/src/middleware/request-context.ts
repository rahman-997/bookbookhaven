import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.header('x-request-id');
  // Untrusted IDs must never be truncated into collisions or contain unsafe header characters.
  const requestId = incomingId && /^[A-Za-z0-9._:-]{1,128}$/.test(incomingId) ? incomingId : randomUUID();
  res.setHeader('x-request-id', requestId);
  res.locals.requestId = requestId;
  const started = performance.now();

  res.on('finish', () => {
    if (env.NODE_ENV === 'test') return;
    const durationMs = Math.round((performance.now() - started) * 10) / 10;
    console.log(JSON.stringify({ level: 'info', requestId, method: req.method, path: req.path, status: res.statusCode, durationMs }));
  });
  next();
}
