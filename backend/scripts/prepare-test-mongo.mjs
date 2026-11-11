// Prepare the MongoDB Memory Server binary once outside Jest's 30s beforeAll deadline.
// This uses disposable local data only; failures remain blocking and never bypass tests.
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const downloadDir = resolve(process.env.MONGOMS_DOWNLOAD_DIR || join(tmpdir(), 'bookhaven-mongodb-binaries'));
await mkdir(downloadDir, { recursive: true });

let mongod;
try {
  mongod = await MongoMemoryServer.create({ binary: { downloadDir } });
  console.log('MongoDB test binary and local startup verified.');
  // Catch driver/replica compatibility failures before Jest triggers 33 cascading hook timeouts.
  await mongoose.connect(mongod.getUri(), { serverSelectionTimeoutMS: 8_000, connectTimeoutMS: 8_000 });
  const result = await mongoose.connection.db.admin().ping();
  if (result.ok !== 1) throw new Error('MongoDB driver ping did not return ok: 1');
  console.log('Mongoose driver connection and isolated MongoDB ping verified.');
} catch (error) {
  console.error('MongoDB fixture preflight failed. Check binary download/network and runner compatibility.');
  console.error(error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
