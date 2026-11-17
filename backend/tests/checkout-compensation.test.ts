import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Book } from '../src/modules/books/book.model';
import { Cart } from '../src/modules/cart/cart.model';
import { Order } from '../src/modules/orders/order.model';
import { create } from '../src/modules/orders/order.service';

let mongo: MongoMemoryServer | undefined;

beforeAll(async () => {
  const binaryDir = join(tmpdir(), 'bookhaven-mongodb-binaries');
  await mkdir(binaryDir, { recursive: true });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: binaryDir } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Book.syncIndexes(), Cart.syncIndexes(), Order.syncIndexes()]);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await Promise.all([Book.deleteMany({}), Cart.deleteMany({}), Order.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

async function makeBook(slug: string, stock: number) {
  return Book.create({
    title: slug,
    slug,
    author: 'Regression tester',
    description: '',
    price: 12,
    stock,
    categories: [],
    featured: false
  });
}

describe('Standalone MongoDB checkout compensation', () => {
  it('releases checkout lock when the preflight stock check fails', async () => {
    const userId = new mongoose.Types.ObjectId();
    const book = await makeBook('preflight-shortage', 1);
    await Cart.create({
      user: userId,
      items: [{ book: book._id, quantity: 2, unitPrice: book.price }]
    });

    await expect(create(String(userId), '123 Test Street, Istanbul', 'manual'))
      .rejects.toThrow('does not have enough stock');

    const cart = await Cart.findOne({ user: userId }).lean();
    expect(cart?.checkoutLockedAt).toBeNull();
    expect(cart?.items).toHaveLength(1);
    expect((await Book.findById(book._id).lean())?.stock).toBe(1);
    expect(await Order.countDocuments()).toBe(0);

    // A second attempt must not be blocked by a leaked five-minute lock.
    await expect(create(String(userId), '123 Test Street, Istanbul', 'manual'))
      .rejects.toThrow('does not have enough stock');
  });

  it('restores the first book after a later conditional inventory decrement fails', async () => {
    const userId = new mongoose.Types.ObjectId();
    const first = await makeBook('partial-first', 3);
    const second = await makeBook('partial-second', 3);
    await Cart.create({
      user: userId,
      items: [
        { book: first._id, quantity: 1, unitPrice: first.price },
        { book: second._id, quantity: 1, unitPrice: second.price }
      ]
    });

    const realUpdate = Book.updateOne.bind(Book);
    let guardedDecrements = 0;
    jest.spyOn(Book, 'updateOne').mockImplementation(((filter: any, update: any, options: any) => {
      if (filter?.stock?.$gte !== undefined) {
        guardedDecrements += 1;
        if (guardedDecrements === 2) {
          // Simulates another checkout winning the stock race after preflight.
          return Promise.resolve({ matchedCount: 1, modifiedCount: 0 });
        }
      }
      return realUpdate(filter, update, options);
    }) as typeof Book.updateOne);

    await expect(create(String(userId), '123 Test Street, Istanbul', 'manual'))
      .rejects.toThrow('stock changed');

    expect(guardedDecrements).toBe(2);
    expect((await Book.findById(first._id).lean())?.stock).toBe(3);
    expect((await Book.findById(second._id).lean())?.stock).toBe(3);
    expect(await Order.countDocuments()).toBe(0);
    const cart = await Cart.findOne({ user: userId }).lean();
    expect(cart?.items).toHaveLength(2);
    expect(cart?.checkoutLockedAt).toBeNull();
  });
});
