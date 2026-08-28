import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/auth/user.model';
import { Order } from '../src/modules/orders/order.model';

let mongo: MongoMemoryServer | undefined;
const mongoDownloadDir = join(tmpdir(), 'bookhaven-mongodb-binaries');

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: mongoDownloadDir } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.syncIndexes(), Order.syncIndexes()]);
});

afterEach(async () => {
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

  it('rejects invalid pagination before business logic runs', async () => {
    const customer = await register('validation@example.com', 'Validation Reader');
    const response = await request(app)
      .get('/api/v1/orders?page=0&limit=1000')
      .set({ Authorization: `Bearer ${customer.token}` });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
