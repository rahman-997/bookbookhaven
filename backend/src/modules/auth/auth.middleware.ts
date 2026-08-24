import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import { User, type UserRole } from './user.model';

export type AuthRequest<P = Record<string, string>> = Request<P> & { auth?: { userId: string; role: UserRole } };

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication required');

  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  if (typeof payload === 'string' || !payload.sub) throw new HttpError(401, 'Invalid token');
  const user = await User.findById(payload.sub).select('role');
  if (!user) throw new HttpError(401, 'User no longer exists');

  req.auth = { userId: String(user._id), role: user.role };
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) throw new HttpError(403, 'Insufficient permissions');
    next();
  };
}
