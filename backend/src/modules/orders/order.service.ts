import { HttpError } from '../../errors/http-error';
import { Book } from '../books/book.model';
import { Cart } from '../cart/cart.model';
import { Order, type OrderDocument, type OrderStatus, type PaymentMethod } from './order.model';

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: []
};
const CHECKOUT_LOCK_MS = 5 * 60_000;

export async function listForUser(userId: string) {
  return Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
}
export async function listAll() {
  return Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(200).lean();
}

export async function create(userId: string, shippingAddress: string, paymentMethod: PaymentMethod) {
  const lockCutoff = new Date(Date.now() - CHECKOUT_LOCK_MS);
  const cart = await Cart.findOneAndUpdate(
    {
      user: userId,
      'items.0': { $exists: true },
      $or: [{ checkoutLockedAt: null }, { checkoutLockedAt: { $lt: lockCutoff } }]
    },
    { $set: { checkoutLockedAt: new Date() } },
    { new: true }
  );

  if (!cart) {
    const existing = await Cart.findOne({ user: userId }).select('items checkoutLockedAt').lean();
    if (!existing || existing.items.length === 0) throw new HttpError(400, 'Your cart is empty', undefined, 'EMPTY_CART');
    throw new HttpError(409, 'Checkout is already in progress. Please wait a moment.', undefined, 'CHECKOUT_IN_PROGRESS');
  }

  const originalCartItems = cart.items.map((item) => ({ book: item.book, quantity: item.quantity, unitPrice: item.unitPrice }));
  const bookIds = originalCartItems.map((item) => item.book);
  const books = await Book.find({ _id: { $in: bookIds } });
  const byId = new Map(books.map((book) => [String(book._id), book]));
  const decremented: Array<{ id: string; quantity: number }> = [];
  let order: OrderDocument | null = null;

  try {
    const items = originalCartItems.map((item) => {
      const book = byId.get(String(item.book));
      if (!book) throw new HttpError(409, 'A book in your cart is no longer available', undefined, 'BOOK_UNAVAILABLE');
      if (book.stock < item.quantity) throw new HttpError(409, `${book.title} does not have enough stock`, undefined, 'INSUFFICIENT_STOCK');
      return { book: book._id, title: book.title, quantity: item.quantity, unitPrice: book.price };
    });
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    for (const item of items) {
      const result = await Book.updateOne({ _id: item.book, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } });
      if (result.modifiedCount !== 1) throw new HttpError(409, `${item.title} stock changed. Please review your cart.`, undefined, 'STOCK_CHANGED');
      decremented.push({ id: String(item.book), quantity: item.quantity });
    }

    order = await Order.create({ user: userId, items, subtotal, status: 'pending', paymentMethod, shippingAddress });
    cart.items = [];
    cart.checkoutLockedAt = null;
    await cart.save();
    return order;
  } catch (error) {
    if (order) await Order.deleteOne({ _id: order._id }).catch(() => undefined);
    await Promise.allSettled(decremented.map((item) => Book.updateOne({ _id: item.id }, { $inc: { stock: item.quantity } })));
    cart.items = originalCartItems;
    cart.checkoutLockedAt = null;
    await cart.save().catch(() => undefined);
    throw error;
  }
}

export async function updateStatus(id: string, status: OrderStatus) {
  const current = await Order.findById(id).lean();
  if (!current) throw new HttpError(404, 'Order not found', undefined, 'ORDER_NOT_FOUND');
  if (current.status === status) return current;
  if (!allowedTransitions[current.status].includes(status)) {
    throw new HttpError(409, `Cannot move order from ${current.status} to ${status}`, { from: current.status, to: status }, 'INVALID_ORDER_TRANSITION');
  }

  const order = await Order.findOneAndUpdate({ _id: id, status: current.status }, { $set: { status } }, { new: true });
  if (!order) throw new HttpError(409, 'Order status changed in another request. Refresh and try again.', undefined, 'ORDER_STATUS_CHANGED');

  if (status === 'cancelled') {
    const restored = await Promise.allSettled(
      order.items.map(async (item) => {
        const result = await Book.updateOne({ _id: item.book }, { $inc: { stock: item.quantity } });
        if (result.matchedCount !== 1) throw new Error(`Book ${String(item.book)} no longer exists`);
        return { book: item.book, quantity: item.quantity };
      })
    );
    const successful = restored
      .filter((result): result is PromiseFulfilledResult<{ book: typeof order.items[number]['book']; quantity: number }> => result.status === 'fulfilled')
      .map((result) => result.value);
    const failed = restored.find((result) => result.status === 'rejected');
    if (failed) {
      await Promise.allSettled(successful.map((item) => Book.updateOne({ _id: item.book }, { $inc: { stock: -item.quantity } })));
      await Order.updateOne({ _id: id, status: 'cancelled' }, { $set: { status: current.status } }).catch(() => undefined);
      throw new HttpError(409, 'Could not restore all inventory. Order cancellation was rolled back.', undefined, 'INVENTORY_RESTORE_FAILED');
    }
  }
  return order;
}
