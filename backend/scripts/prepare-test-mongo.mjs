// Prepare the MongoDB Memory Server binary once outside Jest's 30s beforeAll deadline.
// This uses disposable local data only; failures remain blocking and never bypass tests.
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const downloadDir = resolve(process.env.MONGOMS_DOWNLOAD_DIR || join(tmpdir(), 'bookhaven-mongodb-binaries'));
await mkdir(downloadDir, { recursive: true });

let mongod;
try {
  mongod = await MongoMemoryServer.create({ binary: { downloadDir } });
  console.log('MongoDB test binary and local startup verified.');
} catch (error) {
  console.error('MongoDB fixture preflight failed. Check binary download/network and runner compatibility.');
  console.error(error);
  process.exitCode = 1;
} finally {
  if (mongod) await mongod.stop();
}
