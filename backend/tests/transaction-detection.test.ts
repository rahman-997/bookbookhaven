import mongoose from 'mongoose';
import { mongoTransactionsAvailable } from '../src/database/transactions';

type FakeDb = { admin: () => { command: (command: unknown) => Promise<unknown> } };

function fakeDatabase(hello: () => Promise<unknown>): FakeDb {
  return {
    admin: () => ({ command: async (_command: unknown) => hello() })
  };
}

describe('MongoDB transaction discovery', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(mongoose.connection, 'db', originalDescriptor);
    } else {
      Reflect.deleteProperty(mongoose.connection, 'db');
    }
  });

  function useDb(db: FakeDb) {
    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      writable: true,
      value: db
    });
  }

  it('fails closed when no database connection exists', async () => {
    Object.defineProperty(mongoose.connection, 'db', {
      configurable: true,
      writable: true,
      value: undefined
    });
    expect(await mongoTransactionsAvailable()).toBe(false);
  });

  it('caches successful capability discovery per database object', async () => {
    let checks = 0;
    const db = fakeDatabase(async () => {
      checks += 1;
      return { msg: 'isdbgrid' };
    });
    useDb(db);
    expect(await mongoTransactionsAvailable()).toBe(true);
    expect(await mongoTransactionsAvailable()).toBe(true);
    expect(checks).toBe(1);
  });

  it('does not reuse a standalone result after switching to a replica set', async () => {
    const standalone = fakeDatabase(async () => ({ isWritablePrimary: true }));
    const replica = fakeDatabase(async () => ({ setName: 'rs0' }));
    useDb(standalone);
    expect(await mongoTransactionsAvailable()).toBe(false);
    useDb(replica);
    expect(await mongoTransactionsAvailable()).toBe(true);
    useDb(standalone);
    expect(await mongoTransactionsAvailable()).toBe(false);
  });

  it('retries a transient discovery failure instead of caching false', async () => {
    let attempts = 0;
    const db = fakeDatabase(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('temporary network error');
      return { setName: 'rs0' };
    });
    useDb(db);
    expect(await mongoTransactionsAvailable()).toBe(false);
    expect(await mongoTransactionsAvailable()).toBe(true);
    expect(attempts).toBe(2);
  });
});
