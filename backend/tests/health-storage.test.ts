import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app';
import { setShuttingDown } from '../src/modules/health/runtime-health';

let mongo: MongoMemoryServer | undefined;
const mongoDownloadDir = join(tmpdir(), 'bookhaven-mongodb-binaries');
const originalStorageMode = process.env.BOOKHAVEN_STORAGE_MODE;

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: mongoDownloadDir } });
  await mongoose.connect(mongo.getUri());
});

afterEach(() => {
  setShuttingDown(false);
});

afterAll(async () => {
  if (originalStorageMode === undefined) delete process.env.BOOKHAVEN_STORAGE_MODE;
  else process.env.BOOKHAVEN_STORAGE_MODE = originalStorageMode;
  setShuttingDown(false);
  await mongoose.disconnect();
  await mongo?.stop();
});

describe('Health storage diagnostics', () => {
  it('reports embedded storage as healthy but non-durable', async () => {
    process.env.BOOKHAVEN_STORAGE_MODE = 'ephemeral';

    const response = await request(app).get('/api/v1/health');

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body.data).toMatchObject({
      status: 'ok',
      database: 'up',
      storageMode: 'ephemeral',
      durable: false,
      shuttingDown: false
    });
  });

  it('reports configured external storage as durable', async () => {
    process.env.BOOKHAVEN_STORAGE_MODE = 'external';

    const response = await request(app).get('/api/v1/health/ready');

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toMatchObject({
      status: 'ok',
      database: 'up',
      storageMode: 'external',
      durable: true,
      shuttingDown: false
    });
  });

  it('keeps liveness healthy while readiness drains during shutdown', async () => {
    setShuttingDown(true);

    const [live, ready] = await Promise.all([
      request(app).get('/api/v1/health/live'),
      request(app).get('/api/v1/health/ready')
    ]);

    expect(live.statusCode).toBe(200);
    expect(live.headers['cache-control']).toContain('no-store');
    expect(live.body.data).toMatchObject({
      status: 'ok',
      process: 'up',
      shuttingDown: true
    });

    expect(ready.statusCode).toBe(503);
    expect(ready.headers['cache-control']).toContain('no-store');
    expect(ready.body.success).toBe(false);
    expect(ready.body.data).toMatchObject({
      status: 'degraded',
      database: 'up',
      shuttingDown: true
    });
  });
});
