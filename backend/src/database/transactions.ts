import mongoose from 'mongoose';

/**
 * Resolve topology for the active database at checkout time. Do not cache this
 * across reconnects or silently choose the non-transactional fallback when the
 * topology check itself fails.
 */
export async function mongoTransactionsAvailable(): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');

  try {
    const hello = await db.admin().command({ hello: 1 }) as { setName?: string; msg?: string };
    return Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    throw new Error('MongoDB transaction capability could not be verified');
  }
}
