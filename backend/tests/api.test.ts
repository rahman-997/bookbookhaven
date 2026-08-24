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

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterEach(async () => { await mongoose.connection.db?.dropDatabase(); });
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

async function register(email = 'test@example.com') {
  const res = await request(app).post('/api/v1/auth/register').send({ name: 'Test User', email, password: 'VeryStrong123!' });
  return { token: res.body.data.token as string, user: res.body.data.user };
}
async function createBook() {
  return Book.create({ title: 'Test Book', slug: 'test-book', author: 'Tester', description: 'A useful test book', price: 10, stock: 4, categories: ['test'], featured: false });
}

describe('BookHaven API', () => {
  it('reports health when MongoDB is connected', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('registers a user and returns a token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Test User', email: 'test@example.com', password: 'VeryStrong123!' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('test@example.com');
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

  it('blocks cart mutation while checkout holds an active lock', async () => {
    const { token, user } = await register('locked-cart@example.com');
    const book = await createBook();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/v1/cart/items').set(auth).send({ bookId: String(book._id), quantity: 1 });
    await Cart.updateOne({ user: user.id }, { $set: { checkoutLockedAt: new Date() } });
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
    const { token } = await register('order@example.com');
    await User.updateOne({ email: 'order@example.com' }, { $set: { role: 'admin' } });
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

  it('cleans cart, wishlist and reviews when an admin deletes a book', async () => {
    const { token } = await register('admin-test@example.com');
    const user = await User.findOneAndUpdate({ email: 'admin-test@example.com' }, { $set: { role: 'admin' } }, { new: true });
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
