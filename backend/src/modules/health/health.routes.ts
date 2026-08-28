import { Router } from 'express';
import mongoose from 'mongoose';

type StorageMode = 'external' | 'ephemeral' | 'unknown';

function storageMode(): StorageMode {
  const configuredMode = String(process.env.BOOKHAVEN_STORAGE_MODE || '').trim().toLowerCase();
  if (configuredMode === 'external' || configuredMode === 'ephemeral') return configuredMode;
  return String(process.env.MONGO_URI || '').trim() ? 'external' : 'unknown';
}

export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
  const database = mongoose.connection.readyState === 1 ? 'up' : 'down';
  const mode = storageMode();

  res.status(database === 'up' ? 200 : 503).json({
    success: database === 'up',
    data: {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      storageMode: mode,
      durable: mode === 'external',
      uptime: process.uptime()
    }
  });
});
