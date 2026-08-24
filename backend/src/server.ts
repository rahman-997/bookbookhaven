import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/mongoose';

async function start() {
  await connectDatabase();
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`BookHaven API listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
