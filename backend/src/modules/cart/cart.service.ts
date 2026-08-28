import mongoose from 'mongoose';
import { HttpError } from '../../errors/http-error';
import { Book } from '../books/book.model';
import { Cart } from './cart.model';

const CHECKOUT_LOCK_MS = 5 * 60_000;
const MAX_MUTATION_RETRIES = 4;

function assertEditable(checkoutLockedAt?: Date | null) {
  if (checkoutLockedAt && checkoutLockedAt.getTime() > Date.now() - CHECKOUT_LOCK_MS) {
    throw new HttpError(409, 'Checkout is in progress. Cart changes are temporarily locked.', undefined, 'CART_LOCKED');
  }
}

function isRetryableCartWrite(error: unknown) {
  if (error instanceof mongoose.Error.VersionError) return true;
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

async function retryCartMutation<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_MUTATION_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableCartWrite(error)) throw error;
      if (attempt === MAX_MUTATION_RETRIES) {
        throw new HttpError(409, 'Cart changed in another request. Please retry.', undefined, 'CART_WRITE_CONFLICT');
      }
    }
  }
  throw new HttpError(409, 'Cart changed in another request. Please retry.', undefined, 'CART_WRITE_CONFLICT');
}

async function populatedCart(userId: string) {
  const cart = await Cart.findOne({ user: userId }).populate('items.book').lean();
  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { id: cart?._id ?? null, items, subtotal };
}

export async function getCart(userId: string) {
  return populatedCart(userId);
}

export async function addItem(userId: string, bookId: string, quantity: number) {
  return retryCartMutation(async () => {
    const book = await Book.findById(bookId);
    if (!book) throw new HttpError(404, 'Book not found');
    if (book.stock < quantity) throw new HttpError(409, 'Requested quantity exceeds available stock');

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, items: [] } },
      { upsert: true, returnDocument: 'after' }
    );

    if (!cart) throw new HttpError(500, 'Failed to initialize cart');
    assertEditable(cart.checkoutLockedAt);
    if (cart.checkoutLockedAt) cart.checkoutLockedAt = null;

    const existing = cart.items.find((item) => String(item.book) === bookId);
    if (existing) {
      const nextQuantity = existing.quantity + quantity;
      if (nextQuantity > book.stock) throw new HttpError(409, 'Requested quantity exceeds available stock');
      existing.quantity = nextQuantity;
      existing.unitPrice = book.price;
    } else {
      cart.items.push({ book: book._id, quantity, unitPrice: book.price });
    }

    await cart.save();
    return populatedCart(userId);
  });
}

export async function updateItem(userId: string, bookId: string, quantity: number) {
  return retryCartMutation(async () => {
    const [cart, book] = await Promise.all([Cart.findOne({ user: userId }), Book.findById(bookId)]);
    if (!cart) throw new HttpError(404, 'Cart not found');
    assertEditable(cart.checkoutLockedAt);
    if (cart.checkoutLockedAt) cart.checkoutLockedAt = null;
    if (!book) throw new HttpError(404, 'Book not found');
    if (quantity > book.stock) throw new HttpError(409, 'Requested quantity exceeds available stock');

    const item = cart.items.find((entry) => String(entry.book) === bookId);
    if (!item) throw new HttpError(404, 'Cart item not found');
    item.quantity = quantity;
    item.unitPrice = book.price;
    await cart.save();
    return populatedCart(userId);
  });
}

export async function removeItem(userId: string, bookId: string) {
  return retryCartMutation(async () => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new HttpError(404, 'Cart not found');
    assertEditable(cart.checkoutLockedAt);
    if (cart.checkoutLockedAt) cart.checkoutLockedAt = null;
    const before = cart.items.length;
    cart.items = cart.items.filter((entry) => String(entry.book) !== bookId);
    if (cart.items.length === before) throw new HttpError(404, 'Cart item not found');
    await cart.save();
    return populatedCart(userId);
  });
}

export async function clear(userId: string) {
  await retryCartMutation(async () => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return;
    assertEditable(cart.checkoutLockedAt);
    cart.items = [];
    if (cart.checkoutLockedAt) cart.checkoutLockedAt = null;
    await cart.save();
  });
}
