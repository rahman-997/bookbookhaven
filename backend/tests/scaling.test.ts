import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/auth/user.model';
import { Book } from '../src/modules/books/book.model';
import { Order } from '../src/modules/orders/order.model';
import { Review } from '../src/modules/reviews/review.model';

let mongo: MongoMemoryServer | undefined;
const mongoDownloadDir = join(tmpdir(), 'bookhaven-mongodb-binaries');

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: mongoDownloadDir } });
  await mongoose.connect(mongo.getUri());
});
afterEach(async () => { await mongoose.connection.db?.dropDatabase(); });
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });

async function register(email: string, name = 'Test User') {
  const response = await request(app).post('/api/v1/auth/register').send({ name, email, password: 'VeryStrong123!' });
  return { token: response.body.data.token as string, user: response.body.data.user as { id: string } };
}

describe('BookHaven scalable query surfaces', () => {
  it('paginates and filters admin orders by status and reader search', async () => {
    const admin = await register('admin@example.com', 'Admin Reader');
    const alice = await register('alice@example.com', 'Alice Reader');
    const bob = await register('bob@example.com', 'Bob Reader');
    await User.updateOne({ _id: admin.user.id }, { $set: { role: 'admin' } });

    await Order.create([
      { user: alice.user.id, items: [{ book: new mongoose.Types.ObjectId(), title: 'Alpha', quantity: 1, unitPrice: 12 }], subtotal: 12, status: 'pending', paymentMethod: 'manual', shippingAddress: '123 Alpha Street' },
      { user: alice.user.id, items: [{ book: new mongoose.Types.ObjectId(), title: 'Beta', quantity: 1, unitPrice: 15 }], subtotal: 15, status: 'confirmed', paymentMethod: 'manual', shippingAddress: '456 Beta Street' },
      { user: bob.user.id, items: [{ book: new mongoose.Types.ObjectId(), title: 'Gamma', quantity: 1, unitPrice: 20 }], subtotal: 20, status: 'pending', paymentMethod: 'manual', shippingAddress: '789 Gamma Street' }
    ]);

    const auth = { Authorization: `Bearer ${admin.token}` };
    const response = await request(app).get('/api/v1/orders/admin/all?status=pending&search=Alice&page=1&limit=1').set(auth);
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].user.email).toBe('alice@example.com');
    expect(response.body.meta).toMatchObject({ page: 1, limit: 1, total: 1, pages: 1 });
  });

  it('paginates reviews while preserving aggregate rating metadata', async () => {
    const book = await Book.create({ title: 'Review Book', slug: 'review-book', author: 'Tester', description: '', price: 10, stock: 5, categories: ['test'], featured: false });
    const users = await Promise.all([
      User.create({ name: 'One', email: 'one@example.com', passwordHash: 'hash' }),
      User.create({ name: 'Two', email: 'two@example.com', passwordHash: 'hash' }),
      User.create({ name: 'Three', email: 'three@example.com', passwordHash: 'hash' })
    ]);
    await Review.create([
      { user: users[0]._id, book: book._id, rating: 5, comment: 'Great' },
      { user: users[1]._id, book: book._id, rating: 4, comment: 'Good' },
      { user: users[2]._id, book: book._id, rating: 3, comment: 'Fine' }
    ]);

    const response = await request(app).get(`/api/v1/reviews/book/${book._id}?page=1&limit=2`);
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.count).toBe(3);
    expect(response.body.meta.averageRating).toBe(4);
    expect(response.body.meta.pagination).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2 });
  });

  it('normalizes ISBNs and rejects invalid checksums', async () => {
    const admin = await register('isbn-admin@example.com');
    await User.updateOne({ _id: admin.user.id }, { $set: { role: 'admin' } });
    const auth = { Authorization: `Bearer ${admin.token}` };
    const valid = await request(app).post('/api/v1/books').set(auth).send({
      title: 'ISBN Book', slug: 'isbn-book', author: 'Tester', description: '', isbn: '978-0-306-40615-7', price: 10, stock: 2, categories: [], featured: false
    });
    expect(valid.statusCode).toBe(201);
    expect(valid.body.data.isbn).toBe('9780306406157');

    const invalid = await request(app).post('/api/v1/books').set(auth).send({
      title: 'Bad ISBN', slug: 'bad-isbn', author: 'Tester', description: '', isbn: '9780306406158', price: 10, stock: 2, categories: [], featured: false
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });
});
