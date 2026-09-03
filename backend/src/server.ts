import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/mongoose';
import { setShuttingDown } from './modules/health/runtime-health';

const SHUTDOWN_TIMEOUT_MS = 8_000;

async function start() {
  await connectDatabase();
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`BookHaven API listening on port ${env.PORT}`);
  });

  let shutdownStarted = false;

  const shutdown = async (signal: string) => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    setShuttingDown(true);
    console.log(`${signal} received, draining traffic before shutdown`);

    const hardStop = setTimeout(() => {
      console.error(`Graceful shutdown exceeded ${SHUTDOWN_TIMEOUT_MS}ms; forcing connections closed`);
      server.closeAllConnections();
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    hardStop.unref();

    try {
      const closePromise = new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      server.closeIdleConnections();
      await closePromise;
      await disconnectDatabase();
      clearTimeout(hardStop);
      console.log('BookHaven API shutdown complete');
      process.exit(0);
    } catch (error) {
      clearTimeout(hardStop);
      console.error('Graceful shutdown failed', error);
      try {
        await disconnectDatabase();
      } catch (disconnectError) {
        console.error('Database disconnect failed during shutdown', disconnectError);
      }
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
