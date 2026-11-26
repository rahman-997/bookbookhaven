import { mkdir } from 'node:fs/promises';
import * as os from 'node:os';
import { join } from 'node:path';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { isolatedFixtureUri, mongoTestOptions } from './mongo-options';
import { app } from '../src/app';
import { User } from '../src/modules/auth/user.model';
import { Order } from '../src/modules/orders/order.model';

let mongo: MongoMemoryServer | undefined;
const mongoDownloadDir = join(os.tmpdir(), 'bookhaven-mongodb-binaries');

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  const fixtureUri = process.env.BOOKHAVEN_TEST_MONGO_URI;
  if (fixtureUri) {
    await mongoose.connect(isolatedFixtureUri(fixtureUri), mongoTestOptions);
  } else {
    mongo = await MongoMemoryServer.create({ binary: { downloadDir: mongoDownloadDir } });
    await mongoose.connect(mongo.getUri(), mongoTestOptions);
  }
  await Promise.all([User.syncIndexes(), Order.syncIndexes()]);
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  await Promise.all([User.deleteMany({}), Order.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

async function register(email: string, name: string) {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'VeryStrong123!' });
  return { token: response.body.data.token as string, userId: response.body.data.user.id as string };
}

async function createOrder(userId: string, status: 'pending' | 'confirmed' | 'completed', title: string, address: string) {
  return Order.create({
    user: userId,
    items: [{ book: new Types.ObjectId(), title, quantity: 1, unitPrice: 20 }],
    subtotal: 20,
    status,
    paymentMethod: 'manual',
    shippingAddress: address
  });
}

describe('Order listing queries', () => {
  it('paginates and filters a customer order history', async () => {
    const customer = await register('reader@example.com', 'Reader One');
    await createOrder(customer.userId, 'pending', 'Alpha Book', '10 Alpha Street, Istanbul');
    await createOrder(customer.userId, 'pending', 'Beta Book', '20 Beta Street, Istanbul');
    await createOrder(customer.userId, 'completed', 'Gamma Book', '30 Gamma Street, Istanbul');

    const response = await request(app)
      .get('/api/v1/orders?status=pending&page=2&limit=1')
      .set({ Authorization: `Bearer ${customer.token}` });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe('pending');
    expect(response.body.meta).toEqual({ page: 2, limit: 1, total: 2, pages: 2 });
  });

  it('lets admins search and filter orders without loading the full collection', async () => {
    const customer = await register('customer-search@example.com', 'Searchable Reader');
    const admin = await register('ops@example.com', 'Operations Admin');
    await User.updateOne({ _id: admin.userId }, { $set: { role: 'admin' } });

    await createOrder(customer.userId, 'confirmed', 'Rare Systems Book', '99 Bosphorus Avenue, Istanbul');
    await createOrder(customer.userId, 'completed', 'Common Book', '1 Other Street, Istanbul');

    const response = await request(app)
      .get('/api/v1/orders/admin/all?status=confirmed&search=customer-search&page=1&limit=10')
      .set({ Authorization: `Bearer ${admin.token}` });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe('confirmed');
    expect(response.body.data[0].user.email).toBe('customer-search@example.com');
    expect(response.body.meta).toEqual({ page: 1, limit: 10, total: 1, pages: 1 });
  });

  it('treats regex metacharacters in admin search as literal text', async () => {
    const customer = await register('literal-search@example.com', 'Literal Reader');
    const admin = await register('literal-ops@example.com', 'Literal Operations');
    await User.updateOne({ _id: admin.userId }, { $set: { role: 'admin' } });

    await createOrder(customer.userId, 'confirmed', 'Symbols .*+? Handbook', '44 Literal Street, Istanbul');
    await createOrder(customer.userId, 'confirmed', 'Symbols Anything Handbook', '45 Other Street, Istanbul');

    const response = await request(app)
      .get('/api/v1/orders/admin/all')
      .query({ search: '.*+?', page: 1, limit: 10 })
      .set({ Authorization: `Bearer ${admin.token}` });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].items[0].title).toBe('Symbols .*+? Handbook');
  });

  it('rejects empty or oversized admin searches before business logic runs', async () => {
    const admin = await register('query-validation@example.com', 'Query Validation Admin');
    await User.updateOne({ _id: admin.userId }, { $set: { role: 'admin' } });

    const empty = await request(app)
      .get('/api/v1/orders/admin/all')
      .query({ search: '   ' })
      .set({ Authorization: `Bearer ${admin.token}` });
    expect(empty.statusCode).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');

    const oversized = await request(app)
      .get('/api/v1/orders/admin/all')
      .query({ search: 'a'.repeat(121) })
      .set({ Authorization: `Bearer ${admin.token}` });
    expect(oversized.statusCode).toBe(400);
    expect(oversized.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('uses a unique descending tie-breaker for customer and admin order pages', async () => {
    const customer = await register('ties-reader@example.com', 'Tie Reader');
    const other = await register('ties-other@example.com', 'Other Reader');
    const admin = await register('ties-admin@example.com', 'Tie Admin');
    await User.updateOne({ _id: admin.userId }, { $set: { role: 'admin' } });

    const sameTime = new Date('2026-11-25T10:00:00.000Z');
    const ids = ['000000000000000000000011', '000000000000000000000033',
      '000000000000000000000022', '000000000000000000000044'];
    const titles = ['Tie A', 'Tie C', 'Tie B', 'Other D'];
    for (let i = 0; i < ids.length; i++) {
      await Order.collection.insertOne({
        _id: new Types.ObjectId(ids[i]),
        user: new Types.ObjectId(i === 3 ? other.userId : customer.userId),
        items: [{ book: new Types.ObjectId(), title: titles[i], quantity: 1, unitPrice: 20 }],
        subtotal: 20, status: 'pending', paymentMethod: 'manual',
        shippingAddress: 'Synthetic test address', createdAt: sameTime, updatedAt: sameTime
      });
    }

    const readPages = async (route: string, token: string, count: number) => {
      const actual: string[] = [];
      for (let page = 1; page <= count; page++) {
        const response = await request(app).get(route)
          .query({ page, limit: 1, status: 'pending' })
          .set({ Authorization: `Bearer ${token}` });
        expect(response.statusCode).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.meta.total).toBe(count);
        actual.push(response.body.data[0].items[0].title);
      }
      return actual;
    };
    expect(await readPages('/api/v1/orders', customer.token, 3))
      .toEqual(['Tie C', 'Tie B', 'Tie A']);
    expect(await readPages('/api/v1/orders/admin/all', admin.token, 4))
      .toEqual(['Other D', 'Tie C', 'Tie B', 'Tie A']);
  });

  it('rejects invalid pagination before business logic runs', async () => {
    const customer = await register('validation@example.com', 'Validation Reader');
    const response = await request(app)
      .get('/api/v1/orders?page=0&limit=1000')
      .set({ Authorization: `Bearer ${customer.token}` });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
