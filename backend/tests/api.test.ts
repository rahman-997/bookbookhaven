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
import { Review } from '../src/modules/reviews/review.model';
import { Wishlist } from '../src/modules/wishlist/wishlist.model';

let mongo: MongoMemoryServer | undefined;
const mongoDownloadDir = join(tmpdir(), 'bookhaven-mongodb-binaries');

beforeAll(async () => {
  await mkdir(mongoDownloadDir, { recursive: true });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: mongoDownloadDir } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.syncIndexes(), Book.syncIndexes(), Cart.syncIndexes(), Order.syncIndexes(), Review.syncIndexes(), Wishlist.syncIndexes()]);
});
afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Book.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Wishlist.deleteMany({})
  ]);
});
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });

async function register(email = 'test@example.com') {
  const res = await request(app).post('/api/v1/auth/register').send({ name: 'Test User', email, password: 'VeryStrong123!' });
  return { token: res.body.data.token as string, user: res.body.data.user };
}

async function registerAdmin(email = 'admin-test@example.com') {
  const result = await register(email);
  await User.updateOne({ email }, { $set: { role: 'admin' } });
  return result;
}

async function createBook(overrides: Record<string, unknown> = {}) {
  return Book.create({
    title: 'Test Book',
    slug: 'test-book',
    author: 'Tester',
    description: 'A useful test book',
    price: 10,
    stock: 4,
    categories: ['test'],
    featured: false,
    ...overrides
  });
}

describe('BookHaven API', () => {
  it('reports health when MongoDB is connected', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('registers a user and returns a session lifetime', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Test User', email: 'test@example.com', password: 'VeryStrong123!' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.expiresInSeconds).toEqual(expect.any(Number));
    expect(res.body.data.expiresInSeconds).toBeGreaterThan(0);
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('logs in, exposes current user, and keeps admin APIs protected by RBAC', async () => {
    await register('customer@example.com');
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'customer@example.com', password: 'VeryStrong123!' });
    expect(login.statusCode).toBe(200);
    const token = login.body.data.token as string;

    const me = await request(app).get('/api/v1/auth/me').set({ Authorization: `Bearer ${token}` });
    expect(me.statusCode).toBe(200);
    expect(me.body.data.email).toBe('customer@example.com');
    expect(me.body.data.role).toBe('customer');

    const anonymous = await request(app).post('/api/v1/books').send({});
    expect(anonymous.statusCode).toBe(401);

    const forbidden = await request(app).post('/api/v1/books').set({ Authorization: `Bearer ${token}` }).send({
      title: 'Forbidden', slug: 'forbidden', author: 'Reader', description: '', price: 1, stock: 1, categories: [], featured: false
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('returns centralized validation errors', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'bad-email', password: 'x' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.requestId).toEqual(expect.any(String));
  });

  it('lists books and resolves a book by slug', async () => {
    await createBook();
    const list = await request(app).get('/api/v1/books?limit=10');
    expect(list.statusCode).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);
    const detail = await request(app).get('/api/v1/books/slug/test-book');
    expect(detail.statusCode).toBe(200);
    expect(detail.body.data.title).toBe('Test Book');
  });

  it('rejects invalid price ranges through centralized query validation', async () => {
    const res = await request(app).get('/api/v1/books?minPrice=20&maxPrice=10');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('enforces unique slug and ISBN through the admin API', async () => {
    const { token } = await registerAdmin('catalog-admin@example.com');
    const auth = { Authorization: `Bearer ${token}` };
    const payload = {
      title: 'Unique Book', slug: 'unique-book', author: 'Author', description: 'Catalog test', coverUrl: 'https://example.com/book.jpg', isbn: '9780000000001', price: 12, stock: 3, categories: ['test'], featured: false
    };
    expect((await request(app).post('/api/v1/books').set(auth).send(payload)).statusCode).toBe(201);
    const duplicate = await request(app).post('/api/v1/books').set(auth).send({ ...payload, title: 'Duplicate' });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('retries concurrent cart additions without losing quantity', async () => {
    const { token } = await register('cart-race@example.com');
    const book = await createBook({ stock: 10 });
    const auth = { Authorization: `Bearer ${token}` };

    const results = await Promise.all([
      request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 1 }),
      request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 1 })
    ]);
    expect(results.map((result) => result.statusCode)).toEqual([201, 201]);

    const cart = await request(app).get('/api/v1/cart').set(auth);
    expect(cart.statusCode).toBe(200);
    expect(cart.body.data.items).toHaveLength(1);
    expect(cart.body.data.items[0].quantity).toBe(2);
  });

  it('blocks cart mutation while checkout holds an active lock', async () => {
    const { token, user } = await register('locked-cart@example.com');
    const book = await createBook();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 1 });
    await Cart.updateOne({ user: user.id }, { $set: { checkoutLockedAt: new Date() }, $inc: { __v: 1 } });
    const res = await request(app).patch(`/api/v1/cart/items/${book._id}`).set(auth).send({ quantity: 2 });
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('CART_LOCKED');
  });

  it('supports wishlist, review, cart and zero-cost checkout workflow', async () => {
    const { token } = await register();
    const book = await createBook();
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).post(`/api/v1/wishlist/${book._id}`).set(auth)).statusCode).toBe(201);
    expect((await request(app).put(`/api/v1/reviews/book/${book._id}`).set(auth).send({ rating: 5, comment: 'Excellent' })).statusCode).toBe(201);
    const add = await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 2 });
    expect(add.statusCode).toBe(201);
    expect(add.body.data.subtotal).toBe(20);
    const order = await request(app).post('/api/v1/orders').set(auth).send({ shippingAddress: '123 Test Street, Test City', paymentMethod: 'cash_on_delivery' });
    expect(order.statusCode).toBe(201);
    expect(order.body.data.subtotal).toBe(20);
    expect((await Book.findById(book._id).lean())?.stock).toBe(2);
    expect((await request(app).get('/api/v1/cart').set(auth)).body.data.items).toHaveLength(0);
  });

  it('returns an owned order detail and hides it from another customer', async () => {
    const owner = await register('owner@example.com');
    const outsider = await register('outsider@example.com');
    const book = await createBook();
    const ownerAuth = { Authorization: `Bearer ${owner.token}` };
    const outsiderAuth = { Authorization: `Bearer ${outsider.token}` };

    await request(app).post('/api/v1/cart/items').set(ownerAuth).send({ bookId: String(book._id), quantity: 1 });
    const created = await request(app).post('/api/v1/orders').set(ownerAuth).send({ shippingAddress: '123 Test Street, Test City', paymentMethod: 'manual' });
    const orderId = created.body.data._id as string;

    const ownDetail = await request(app).get(`/api/v1/orders/${orderId}`).set(ownerAuth);
    expect(ownDetail.statusCode).toBe(200);
    expect(ownDetail.body.data._id).toBe(orderId);

    const hidden = await request(app).get(`/api/v1/orders/${orderId}`).set(outsiderAuth);
    expect(hidden.statusCode).toBe(404);
    expect(hidden.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('prevents duplicate concurrent checkout for the same cart', async () => {
    const { token } = await register('checkout@example.com');
    const book = await createBook();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 2 });
    const results = await Promise.all([
      request(app).post('/api/v1/orders').set(auth).send({ shippingAddress: '123 Test Street, Test City', paymentMethod: 'manual' }),
      request(app).post('/api/v1/orders').set(auth).send({ shippingAddress: '123 Test Street, Test City', paymentMethod: 'manual' })
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Book.findById(book._id).lean())?.stock).toBe(2);
  });

  it('enforces order transitions and restores stock only once on cancellation', async () => {
    const { token } = await registerAdmin('order@example.com');
    const book = await createBook();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 1 });
    const created = await request(app).post('/api/v1/orders').set(auth).send({ shippingAddress: '123 Test Street, Test City', paymentMethod: 'manual' });
    const id = created.body.data._id as string;
    const invalid = await request(app).patch(`/api/v1/orders/admin/${id}/status`).set(auth).send({ status: 'shipped' });
    expect(invalid.statusCode).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_ORDER_TRANSITION');
    const cancelled = await Promise.all([
      request(app).patch(`/api/v1/orders/admin/${id}/status`).set(auth).send({ status: 'cancelled' }),
      request(app).patch(`/api/v1/orders/admin/${id}/status`).set(auth).send({ status: 'cancelled' })
    ]);
    expect(cancelled.some((r) => r.statusCode === 200)).toBe(true);
    expect((await Book.findById(book._id).lean())?.stock).toBe(4);
  });

  it('prevents deleting inventory while an active order still depends on it', async () => {
    const { token } = await registerAdmin('delete-guard@example.com');
    const book = await createBook();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 1 });
    const created = await request(app).post('/api/v1/orders').set(auth).send({ shippingAddress: '123 Test Street, Test City', paymentMethod: 'manual' });
    expect(created.statusCode).toBe(201);

    const blocked = await request(app).delete(`/api/v1/books/${book._id}`).set(auth);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.body.error.code).toBe('BOOK_HAS_ACTIVE_ORDERS');
    expect(await Book.exists({ _id: book._id })).not.toBeNull();
  });

  it('prevents a customer from deleting another customer review', async () => {
    const owner = await register('review-owner@example.com');
    const outsider = await register('review-outsider@example.com');
    const book = await createBook();
    const created = await request(app)
      .put(`/api/v1/reviews/book/${book._id}`)
      .set({ Authorization: `Bearer ${owner.token}` })
      .send({ rating: 4, comment: 'Helpful' });
    expect(created.statusCode).toBe(201);

    const denied = await request(app)
      .delete(`/api/v1/reviews/${created.body.data._id}`)
      .set({ Authorization: `Bearer ${outsider.token}` });
    expect(denied.statusCode).toBe(403);
  });

  it('cleans cart, wishlist and reviews when an admin deletes a book', async () => {
    const { token } = await registerAdmin('cleanup-admin@example.com');
    const user = await User.findOne({ email: 'cleanup-admin@example.com' });
    expect(user).not.toBeNull();
    const book = await createBook();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post(`/api/v1/wishlist/${book._id}`).set(auth);
    await request(app).put(`/api/v1/reviews/book/${book._id}`).set(auth).send({ rating: 4, comment: 'Good' });
    await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 1 });
    expect((await request(app).delete(`/api/v1/books/${book._id}`).set(auth)).statusCode).toBe(204);
    expect(await Review.countDocuments({ book: book._id })).toBe(0);
    expect((await Wishlist.findOne({ user: user!._id }).lean())?.books).toHaveLength(0);
    expect((await Cart.findOne({ user: user!._id }).lean())?.items).toHaveLength(0);
  });
});
