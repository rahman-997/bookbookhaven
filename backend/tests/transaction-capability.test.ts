import mongoose from 'mongoose';
import { mongoTransactionsAvailable } from '../src/database/transactions';

const originalDbDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');

function setDatabase(hello: () => Promise<unknown>) {
  let calls = 0;
  const db = {
    admin: () => ({
      command: async (_cmd: unknown) => {
        calls += 1;
        return hello();
      }
    })
  };
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    writable: true,
    value: db
  });
  return { calls: () => calls };
}

afterEach(() => {
  if (originalDbDescriptor) {
    Object.defineProperty(mongoose.connection, 'db', originalDbDescriptor);
  } else {
    Reflect.deleteProperty(mongoose.connection, 'db');
  }
});

describe('MongoDB checkout topology detection', () => {
  it('fails closed without a database connection', async () => {
    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      writable: true,
      value: undefined
    });
    await expect(mongoTransactionsAvailable()).rejects.toThrow('MongoDB connection is unavailable');
  });

  it('selects standalone compensation only for a confirmed standalone server', async () => {
    const db = setDatabase(async () => ({ isWritablePrimary: true }));
    await expect(mongoTransactionsAvailable()).resolves.toBe(false);
    expect(db.calls()).toBe(1);
  });

  it('identifies a replica set as supporting transactions', async () => {
    setDatabase(async () => ({ setName: 'rs0' }));
    await expect(mongoTransactionsAvailable()).resolves.toBe(true);
  });

  it('identifies a sharded MongoDB cluster as supporting transactions', async () => {
    setDatabase(async () => ({ msg: 'isdbgrid' }));
    await expect(mongoTransactionsAvailable()).resolves.toBe(true);
  });

  it('rechecks the same database when its reported topology changes', async () => {
    let replica = false;
    const db = setDatabase(async () => replica ? { setName: 'rs0' } : {});
    await expect(mongoTransactionsAvailable()).resolves.toBe(false);
    replica = true;
    await expect(mongoTransactionsAvailable()).resolves.toBe(true);
    expect(db.calls()).toBe(2);
  });

  it('does not silently downgrade on a temporary hello error and retries later', async () => {
    let attempts = 0;
    setDatabase(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('transient connection error');
      return { setName: 'rs0' };
    });
    await expect(mongoTransactionsAvailable())
      .rejects.toThrow('MongoDB transaction capability could not be verified');
    await expect(mongoTransactionsAvailable()).resolves.toBe(true);
    expect(attempts).toBe(2);
  });
});
