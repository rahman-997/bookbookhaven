import mongoose from 'mongoose';

// Each MongoDB connection has its own transaction capabilities. A global boolean
// can leak a standalone-server result into a later replica-set connection.
const transactionSupportByDb = new WeakMap<object, boolean>();

export async function mongoTransactionsAvailable() {
  const db = mongoose.connection.db;
  if (!db) return false;

  const cached = transactionSupportByDb.get(db);
  if (cached !== undefined) return cached;

  try {
    const hello = await db.admin().command({ hello: 1 }) as { setName?: string; msg?: string };
    const available = Boolean(hello.setName || hello.msg === 'isdbgrid');
    transactionSupportByDb.set(db, available);
    return available;
  } catch {
    // A transient discovery error should be retried on the next request.
    return false;
  }
}
