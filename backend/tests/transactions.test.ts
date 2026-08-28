import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/auth/user.model';
import { Book } from '../src/modules/books/book.model';
import { Cart } from '../src/modules/cart/cart.model';
import { Order } from '../src/modules/orders/order.model';

let replicaSet: MongoMemoryReplSet | undefined;
const mongoDownloadDir = join(tmpdir(), 'bookhaven-mongodb-binaries');

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  replicaSet = await MongoMemoryReplSet.create({
    binary: { downloadDir: mongoDownloadDir },
    replSet: { count: 1 }
  });
  await mongoose.connect(replicaSet.getUri());
  await Promise.all([User.syncIndexes(), Book.syncIndexes(), Cart.syncIndexes(), Order.syncIndexes()]);
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Book.deleteMany({}), Cart.deleteMany({}), Order.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replicaSet?.stop();
});

async function registerAdmin() {
  const email = 'transaction-admin@example.com';
  const response = await request(app).post('/api/v1/auth/register').send({
    name: 'Transaction Admin',
    email,
    password: 'VeryStrong123!'
  });
  await User.updateOne({ email }, { $set: { role: 'admin' } });
  return response.body.data.token as string;
}

describe('Replica-set transaction path', () => {
  it('atomically checks out and restores inventory on cancellation', async () => {
    const token = await registerAdmin();
    const auth = { Authorization: `Bearer ${token}` };
    const book = await Book.create({
      title: 'Transactional Book',
      slug: 'transactional-book',
      author: 'Tester',
      description: '',
      price: 25,
      stock: 3,
      categories: ['test'],
      featured: false
    });

    const add = await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 2 });
    expect(add.statusCode).toBe(201);

    const checkout = await request(app).post('/api/v1/orders').set(auth).send({
      shippingAddress: '123 Transaction Street, Istanbul',
      paymentMethod: 'manual'
    });
    expect(checkout.statusCode).toBe(201);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Book.findById(book._id).lean())?.stock).toBe(1);
    expect((await Cart.findOne().lean())?.items).toHaveLength(0);

    const cancelled = await request(app)
      .patch(`/api/v1/orders/admin/${checkout.body.data._id}/status`)
      .set(auth)
      .send({ status: 'cancelled' });
    expect(cancelled.statusCode).toBe(200);
    expect((await Book.findById(book._id).lean())?.stock).toBe(3);
  });
});
