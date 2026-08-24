import { spawn } from 'node:child_process';
import process from 'node:process';

const publicPort = process.env.PORT || '10000';
const backendPort = process.env.BACKEND_PORT || '3001';
const nodeEnv = process.env.NODE_ENV || 'production';
const internalApiUrl = process.env.INTERNAL_API_URL || `http://127.0.0.1:${backendPort}/api/v1`;

const children = new Set();
let shuttingDown = false;

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

async function seedIfEnabled() {
  if (!['1', 'true', 'yes'].includes(String(process.env.AUTO_SEED || '').toLowerCase())) return;
  console.log('[bookhaven] AUTO_SEED enabled; applying idempotent seed data...');
  const seed = run(process.execPath, ['backend/dist/seed.js'], {
    env: { NODE_ENV: nodeEnv, PORT: backendPort, HOST: '127.0.0.1' }
  });
  await waitForExit(seed, 'seed');
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bookhaven] ${signal} received; stopping services...`);
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 8000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
    shutdown(`${name}_EXIT`);
    process.exitCode = code || 1;
  };

  backend.on('exit', fail('backend'));
  frontend.on('exit', fail('frontend'));

  console.log(`[bookhaven] frontend public port: ${publicPort}`);
  console.log(`[bookhaven] backend internal URL: ${internalApiUrl}`);
} catch (error) {
  console.error('[bookhaven] startup failed', error);
  shutdown('STARTUP_FAILURE');
  process.exit(1);
}
