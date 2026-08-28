import mongoose from 'mongoose';

let cachedTransactionSupport: boolean | undefined;

export async function mongoTransactionsAvailable() {
  if (cachedTransactionSupport !== undefined) return cachedTransactionSupport;

  const db = mongoose.connection.db;
  if (!db) return false;

  try {
    const hello = await db.admin().command({ hello: 1 }) as { setName?: string; msg?: string };
    cachedTransactionSupport = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    cachedTransactionSupport = false;
  }

  return cachedTransactionSupport;
}
