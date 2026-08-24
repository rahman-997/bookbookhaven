import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getStats } from './admin.controller';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));
adminRouter.get('/stats', getStats);
