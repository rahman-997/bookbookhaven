import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/auth/user.model';
import { Book } from '../src/modules/books/book.model';
import { Cart } from '../src/modules/cart/cart.model';
import { Order } from '../src/modules/orders/order.model';

let mongo: MongoMemoryServer | undefined;
const mongoDownloadDir = join(tmpdir(), 'bookhaven-mongodb-binaries');

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: mongoDownloadDir } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.syncIndexes(), Book.syncIndexes(), Cart.syncIndexes(), Order.syncIndexes()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

async function register(email: string, name: string) {
  const response = await request(app).post('/api/v1/auth/register').send({ name, email, password: 'VeryStrong123!' });
  return { token: response.body.data.token as string, user: response.body.data.user };
}

it('paginates, filters, and searches the admin order queue', async () => {
  const admin = await register('orders-admin@example.com', 'Orders Admin');
  await User.updateOne({ email: 'orders-admin@example.com' }, { $set: { role: 'admin' } });
  const customer = await register('reader-search@example.com', 'Searchable Reader');
  const book = await Book.create({
    title: 'Searchable Atlas',
    slug: 'searchable-atlas',
    author: 'Tester',
    description: 'Admin order search fixture',
    price: 15,
    stock: 4,
    categories: ['test'],
    featured: false
  });

  const customerAuth = { Authorization: `Bearer ${customer.token}` };
  await request(app).post('/api/v1/cart/items').set(customerAuth).send({ bookId: String(book._id), quantity: 1 });
  const created = await request(app).post('/api/v1/orders').set(customerAuth).send({
    shippingAddress: '456 Search Avenue, Test City',
    paymentMethod: 'manual'
  });
  expect(created.statusCode).toBe(201);

  const adminAuth = { Authorization: `Bearer ${admin.token}` };
  const byReader = await request(app)
    .get('/api/v1/orders/admin/all?page=1&limit=1&status=pending&search=reader-search@example.com')
    .set(adminAuth);

  expect(byReader.statusCode).toBe(200);
  expect(byReader.body.data).toHaveLength(1);
  expect(byReader.body.data[0]._id).toBe(created.body.data._id);
  expect(byReader.body.meta).toEqual({ page: 1, limit: 1, total: 1, pages: 1 });

  const byBook = await request(app)
    .get('/api/v1/orders/admin/all?search=Searchable%20Atlas')
    .set(adminAuth);
  expect(byBook.statusCode).toBe(200);
  expect(byBook.body.data).toHaveLength(1);

  const invalid = await request(app).get('/api/v1/orders/admin/all?limit=101').set(adminAuth);
  expect(invalid.statusCode).toBe(400);
  expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
});
