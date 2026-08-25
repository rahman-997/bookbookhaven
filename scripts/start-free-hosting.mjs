import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
import process from 'node:process';

const publicPort = process.env.PORT || '10000';
const backendPort = process.env.BACKEND_PORT || '3001';
const nodeEnv = process.env.NODE_ENV || 'production';
const internalApiUrl = process.env.INTERNAL_API_URL || `http://127.0.0.1:${backendPort}/api/v1`;
const configuredMongoUri = String(process.env.MONGO_URI || '').trim();

const children = new Set();
let shuttingDown = false;
let embeddedMongo;

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
    env: { ...process.env, ...options.env }
  });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

function waitForExit(child, label) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code ?? 'null'}${signal ? ` (${signal})` : ''}`));
    });
  });
}

function startSetupServer() {
  const server = http.createServer((request, response) => {
    if (request.url === '/api/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ status: 'setup-required', frontend: 'ready', database: 'not-configured' }));
      return;
    }

    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY'
    });
    response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BookHaven setup</title><style>body{margin:0;background:#090b12;color:#f8f4e8;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}.card{max-width:680px;margin:24px;padding:40px;border:1px solid #2b3040;border-radius:24px;background:#111522;box-shadow:0 30px 80px #0008}small{color:#d2ad67;text-transform:uppercase;letter-spacing:.18em}h1{font-size:clamp(2rem,7vw,4rem);margin:.35em 0}p{color:#b8bfd0;line-height:1.7}code{color:#dac185}</style></head><body><main class="card"><small>BookHaven 4.0</small><h1>Almost ready.</h1><p>The application is deployed successfully. Connect a free MongoDB Atlas M0 database by setting <code>MONGO_URI</code> in Render, then redeploy. No paid service is required.</p></main></body></html>`);
  });
  server.listen(Number(publicPort), '0.0.0.0', () => {
    console.log(`[bookhaven] setup mode listening on ${publicPort}; MONGO_URI is not configured`);
  });
}

async function ensureMongoUri() {
  if (configuredMongoUri && configuredMongoUri !== 'PENDING_ATLAS') return true;

  try {
    const requireFromBackend = createRequire(new URL('../backend/package.json', import.meta.url));
    const { MongoMemoryServer } = requireFromBackend('mongodb-memory-server');
    embeddedMongo = await MongoMemoryServer.create({ instance: { dbName: 'bookhaven' } });
    process.env.MONGO_URI = embeddedMongo.getUri();
    console.warn('[bookhaven] MONGO_URI is not configured; using an ephemeral embedded MongoDB for this portfolio demo');
    return true;
  } catch (error) {
    console.error('[bookhaven] embedded MongoDB failed to start; falling back to setup mode', error);
    startSetupServer();
    return false;
  }
}

async function seedIfEnabled() {
  if (!['1', 'true', 'yes'].includes(String(process.env.AUTO_SEED || '').toLowerCase())) return;
  console.log('[bookhaven] AUTO_SEED enabled; applying idempotent seed data...');
  const seed = run(process.execPath, ['backend/dist/seed.js'], {
    env: { NODE_ENV: nodeEnv, PORT: backendPort, HOST: '127.0.0.1' }
  });
  await waitForExit(seed, 'seed');
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bookhaven] ${signal} received; stopping services...`);
  for (const child of children) child.kill('SIGTERM');
  if (embeddedMongo) await embeddedMongo.stop().catch(() => undefined);
  setTimeout(() => process.exit(0), 8000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

if (await ensureMongoUri()) {
  try {
    await seedIfEnabled();

    const backend = run(process.execPath, ['backend/dist/server.js'], {
      env: {
        NODE_ENV: nodeEnv,
        PORT: backendPort,
        HOST: '127.0.0.1'
      }
    });

    const frontend = run('npm', ['start', '--prefix', 'frontend', '--', '-p', publicPort, '-H', '0.0.0.0'], {
      env: {
        NODE_ENV: nodeEnv,
        INTERNAL_API_URL: internalApiUrl
      }
    });

    const fail = (name) => (code, signal) => {
      if (shuttingDown) return;
      console.error(`[bookhaven] ${name} stopped unexpectedly: code=${code} signal=${signal}`);
      void shutdown(`${name}_EXIT`);
      process.exitCode = code || 1;
    };

    backend.on('exit', fail('backend'));
    frontend.on('exit', fail('frontend'));

    console.log(`[bookhaven] frontend public port: ${publicPort}`);
    console.log(`[bookhaven] backend internal URL: ${internalApiUrl}`);
  } catch (error) {
    console.error('[bookhaven] startup failed', error);
    void shutdown('STARTUP_FAILURE');
    process.exit(1);
  }
}
