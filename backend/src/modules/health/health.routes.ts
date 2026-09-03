import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { isShuttingDown } from './runtime-health';

type StorageMode = 'external' | 'ephemeral' | 'unknown';

const DATABASE_PING_TIMEOUT_MS = 1_000;

function storageMode(): StorageMode {
  const configuredMode = String(process.env.BOOKHAVEN_STORAGE_MODE || '').trim().toLowerCase();
  if (configuredMode === 'external' || configuredMode === 'ephemeral') return configuredMode;
  return String(process.env.MONGO_URI || '').trim() ? 'external' : 'unknown';
}

function disableCaching(res: Response) {
  res.set('Cache-Control', 'no-store, max-age=0');
}

async function databaseReady() {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !db) return false;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.admin().ping(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Database health check timed out')), DATABASE_PING_TIMEOUT_MS);
      })
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readinessResponse(res: Response) {
  disableCaching(res);

  const shuttingDown = isShuttingDown();
  const database = (await databaseReady()) ? 'up' : 'down';
  const ready = database === 'up' && !shuttingDown;
  const mode = storageMode();

  return res.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      status: ready ? 'ok' : 'degraded',
      database,
      storageMode: mode,
      durable: mode === 'external',
      shuttingDown,
      uptime: process.uptime()
    }
  });
}

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  disableCaching(res);
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      process: 'up',
      shuttingDown: isShuttingDown(),
      uptime: process.uptime()
    }
  });
});

healthRouter.get('/ready', async (_req, res) => readinessResponse(res));
healthRouter.get('/', async (_req, res) => readinessResponse(res));
