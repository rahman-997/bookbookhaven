import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
  const database = mongoose.connection.readyState === 1 ? 'up' : 'down';
  res.status(database === 'up' ? 200 : 503).json({
    success: database === 'up',
    data: { status: database === 'up' ? 'ok' : 'degraded', database, uptime: process.uptime() }
  });
});
