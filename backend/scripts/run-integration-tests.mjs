// Start disposable standalone and replica-set MongoDB fixtures OUTSIDE Jest hook limits.
// Each Jest suite uses a shared URI; no production services, secrets, or remote databases.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';

const require = createRequire(import.meta.url);
const jestBinary = require.resolve('jest/bin/jest');
const downloadDir = resolve(process.env.MONGOMS_DOWNLOAD_DIR || join(tmpdir(), 'bookhaven-mongodb-binaries'));
await mkdir(downloadDir, { recursive: true });

let standalone;
let replica;
try {
  standalone = await MongoMemoryServer.create({ binary: { downloadDir } });
  replica = await MongoMemoryReplSet.create({
    binary: { downloadDir },
    replSet: { count: 1 }
  });
  console.log('Disposable standalone and replica-set MongoDB fixtures started outside Jest.');
  const env = {
    ...process.env,
    BOOKHAVEN_TEST_MONGO_URI: standalone.getUri(),
    BOOKHAVEN_TEST_REPLICA_URI: replica.getUri()
  };
  const exitCode = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [jestBinary, '--runInBand', ...process.argv.slice(2)], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('close', (code, signal) => done(signal ? 1 : (code ?? 1)));
  });
  process.exitCode = exitCode;
} catch (error) {
  console.error('Isolated MongoDB/Jest bootstrap failed:', error);
  process.exitCode = 1;
} finally {
  // Always stop synthetic services, including on Jest failure.
  if (replica) await replica.stop().catch((e) => console.error('Replica cleanup:', e));
  if (standalone) await standalone.stop().catch((e) => console.error('Standalone cleanup:', e));
}
