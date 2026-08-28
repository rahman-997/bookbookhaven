import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/auth/user.model';
import { Book } from '../src/modules/books/book.model';
import { Review } from '../src/modules/reviews/review.model';

let mongo: MongoMemoryServer | undefined;
const mongoDownloadDir = join(tmpdir(), 'bookhaven-mongodb-binaries');

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: mongoDownloadDir } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.syncIndexes(), Book.syncIndexes(), Review.syncIndexes()]);
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Book.deleteMany({}), Review.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

async function registerAdmin(email = 'catalog-admin@example.com') {
  const response = await request(app).post('/api/v1/auth/register').send({
    name: 'Catalog Admin',
    email,
    password: 'VeryStrong123!'
  });
  await User.updateOne({ email }, { $set: { role: 'admin' } });
  return response.body.data.token as string;
}

describe('Catalog and review scaling', () => {
  it('normalizes valid ISBNs and rejects invalid checksums', async () => {
    const token = await registerAdmin();
    const auth = { Authorization: `Bearer ${token}` };

    const valid = await request(app).post('/api/v1/books').set(auth).send({
      title: 'ISBN Book',
      slug: 'isbn-book',
      author: 'Tester',
      description: '',
      isbn: '978-0-306-40615-7',
      price: 10,
      stock: 2,
      categories: [],
      featured: false
    });
    expect(valid.statusCode).toBe(201);
    expect(valid.body.data.isbn).toBe('9780306406157');

    const invalid = await request(app).post('/api/v1/books').set(auth).send({
      title: 'Bad ISBN',
      slug: 'bad-isbn',
      author: 'Tester',
      description: '',
      isbn: '9780306406158',
      price: 10,
      stock: 2,
      categories: [],
      featured: false
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('paginates catalog search results instead of loading the whole collection', async () => {
    await Book.create([
      { title: 'Systems Alpha', slug: 'systems-alpha', author: 'One', description: 'systems', price: 10, stock: 2, categories: ['engineering'], featured: false },
      { title: 'Systems Beta', slug: 'systems-beta', author: 'Two', description: 'systems', price: 11, stock: 2, categories: ['engineering'], featured: false },
      { title: 'Other Book', slug: 'other-book', author: 'Three', description: 'fiction', price: 12, stock: 2, categories: ['fiction'], featured: false }
    ]);

    const response = await request(app).get('/api/v1/books?search=systems&page=1&limit=1&sort=title');
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
  });

  it('paginates reviews while preserving aggregate rating metadata', async () => {
    const book = await Book.create({ title: 'Review Book', slug: 'review-book', author: 'Tester', description: '', price: 10, stock: 5, categories: ['test'], featured: false });
    const users = await User.create([
      { name: 'One', email: 'one@example.com', passwordHash: 'hash' },
      { name: 'Two', email: 'two@example.com', passwordHash: 'hash' },
      { name: 'Three', email: 'three@example.com', passwordHash: 'hash' }
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
});
