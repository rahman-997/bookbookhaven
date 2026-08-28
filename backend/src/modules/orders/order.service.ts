import mongoose, { type ClientSession } from 'mongoose';
import { mongoTransactionsAvailable } from '../../database/transactions';
import { HttpError } from '../../errors/http-error';
import { User } from '../auth/user.model';
import { Book } from '../books/book.model';
import { Cart } from '../cart/cart.model';
import { Order, type OrderStatus, type PaymentMethod } from './order.model';

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: []
};
const CHECKOUT_LOCK_MS = 5 * 60_000;

type ListInput = { page: number; limit: number; status?: OrderStatus };
type AdminListInput = ListInput & { search?: string };

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listForUser(userId: string, input: ListInput) {
  const filter: Record<string, unknown> = { user: userId };
  if (input.status) filter.status = input.status;

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit).lean(),
    Order.countDocuments(filter)
  ]);

  return { items, pagination: pagination(input.page, input.limit, total) };
}

export async function getForUser(userId: string, id: string) {
  const order = await Order.findOne({ _id: id, user: userId }).lean();
  if (!order) throw new HttpError(404, 'Order not found', undefined, 'ORDER_NOT_FOUND');
  return order;
}

export async function listAll(input: AdminListInput) {
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;

  if (input.search) {
    const regex = new RegExp(escapeRegex(input.search), 'i');
    const users = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').limit(100).lean();
    const clauses: Record<string, unknown>[] = [
      { shippingAddress: regex },
      { 'items.title': regex },
      { user: { $in: users.map((user) => user._id) } }
    ];
    if (mongoose.isValidObjectId(input.search)) clauses.push({ _id: input.search });
    filter.$or = clauses;
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .lean(),
    Order.countDocuments(filter)
  ]);

  return { items, pagination: pagination(input.page, input.limit, total) };
}

async function acquireCheckoutCart(userId: string, session?: ClientSession) {
  const lockCutoff = new Date(Date.now() - CHECKOUT_LOCK_MS);
  const query = Cart.findOneAndUpdate(
    {
      user: userId,
      'items.0': { $exists: true },
      $or: [{ checkoutLockedAt: null }, { checkoutLockedAt: { $lt: lockCutoff } }]
    },
    { $set: { checkoutLockedAt: new Date() }, $inc: { __v: 1 } },
    { returnDocument: 'after' }
  );
  if (session) query.session(session);
  const cart = await query;
  if (cart) return cart;

  const existingQuery = Cart.findOne({ user: userId }).select('items checkoutLockedAt');
  if (session) existingQuery.session(session);
  const existing = await existingQuery.lean();
  if (!existing || existing.items.length === 0) throw new HttpError(400, 'Your cart is empty', undefined, 'EMPTY_CART');
  throw new HttpError(409, 'Checkout is already in progress. Please wait a moment.', undefined, 'CHECKOUT_IN_PROGRESS');
}

async function buildCheckoutItems(cart: Awaited<ReturnType<typeof acquireCheckoutCart>>, session?: ClientSession) {
  const originalCartItems = cart.items.map((item) => ({ book: item.book, quantity: item.quantity, unitPrice: item.unitPrice }));
  const bookIds = originalCartItems.map((item) => item.book);
  const booksQuery = Book.find({ _id: { $in: bookIds } });
  if (session) booksQuery.session(session);
  const books = await booksQuery;
  const byId = new Map(books.map((book) => [String(book._id), book]));
  const items = originalCartItems.map((item) => {
    const book = byId.get(String(item.book));
    if (!book) throw new HttpError(409, 'A book in your cart is no longer available', undefined, 'BOOK_UNAVAILABLE');
    if (book.stock < item.quantity) throw new HttpError(409, `${book.title} does not have enough stock`, undefined, 'INSUFFICIENT_STOCK');
    return { book: book._id, title: book.title, quantity: item.quantity, unitPrice: book.price };
  });
  return {
    originalCartItems,
    bookIds,
    items,
    subtotal: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  };
}

async function decrementInventory(
  items: Array<{ book: mongoose.Types.ObjectId; title: string; quantity: number }>,
  session?: ClientSession
) {
  const decremented: Array<{ id: string; quantity: number }> = [];
  for (const item of items) {
    const result = await Book.updateOne(
      { _id: item.book, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      session ? { session } : undefined
    );
    if (result.modifiedCount !== 1) {
      throw new HttpError(409, `${item.title} stock changed. Please review your cart.`, undefined, 'STOCK_CHANGED');
    }
    decremented.push({ id: String(item.book), quantity: item.quantity });
  }
  return decremented;
}

async function createWithTransaction(userId: string, shippingAddress: string, paymentMethod: PaymentMethod) {
  return mongoose.connection.transaction(async (session) => {
    const cart = await acquireCheckoutCart(userId, session);
    const { items, subtotal } = await buildCheckoutItems(cart, session);
    await decrementInventory(items, session);
    const [order] = await Order.create(
      [{ user: userId, items, subtotal, status: 'pending', paymentMethod, shippingAddress }],
      { session }
    );
    if (!order) throw new HttpError(500, 'Could not create order', undefined, 'ORDER_CREATE_FAILED');
    cart.items = [];
    cart.checkoutLockedAt = null;
    await cart.save({ session });
    return order;
  });
}

async function createWithCompensation(userId: string, shippingAddress: string, paymentMethod: PaymentMethod) {
  const cart = await acquireCheckoutCart(userId);
  const { originalCartItems, bookIds, items, subtotal } = await buildCheckoutItems(cart);
  const decremented: Array<{ id: string; quantity: number }> = [];
  let orderId: string | null = null;

  try {
    decremented.push(...await decrementInventory(items));
    const order = await Order.create({ user: userId, items, subtotal, status: 'pending', paymentMethod, shippingAddress });
    orderId = String(order._id);
    cart.items = [];
    cart.checkoutLockedAt = null;
    await cart.save();
    return order;
  } catch (error) {
    if (orderId) await Order.deleteOne({ _id: orderId }).catch(() => undefined);
    await Promise.allSettled(decremented.map((item) => Book.updateOne({ _id: item.id }, { $inc: { stock: item.quantity } })));

    const survivingBooks = await Book.find({ _id: { $in: bookIds } }).select('_id').lean().catch(() => []);
    const survivingIds = new Set(survivingBooks.map((book) => String(book._id)));
    cart.items = originalCartItems.filter((item) => survivingIds.has(String(item.book)));
    cart.checkoutLockedAt = null;
    await cart.save().catch(() => undefined);
    throw error;
  }
}

export async function create(userId: string, shippingAddress: string, paymentMethod: PaymentMethod) {
  if (await mongoTransactionsAvailable()) return createWithTransaction(userId, shippingAddress, paymentMethod);
  return createWithCompensation(userId, shippingAddress, paymentMethod);
}

function assertTransition(current: OrderStatus, target: OrderStatus) {
  if (!allowedTransitions[current].includes(target)) {
    throw new HttpError(409, `Cannot move order from ${current} to ${target}`, { from: current, to: target }, 'INVALID_ORDER_TRANSITION');
  }
}

async function updateStatusWithTransaction(id: string, status: OrderStatus) {
  return mongoose.connection.transaction(async (session) => {
    const current = await Order.findById(id).session(session).lean();
    if (!current) throw new HttpError(404, 'Order not found', undefined, 'ORDER_NOT_FOUND');
    if (current.status === status) return current;
    assertTransition(current.status, status);

    const order = await Order.findOneAndUpdate(
      { _id: id, status: current.status },
      { $set: { status } },
      { returnDocument: 'after', session }
    );
    if (!order) {
      throw new HttpError(409, 'Order status changed in another request. Refresh and try again.', undefined, 'ORDER_STATUS_CHANGED');
    }

    if (status === 'cancelled') {
      for (const item of order.items) {
        const result = await Book.updateOne({ _id: item.book }, { $inc: { stock: item.quantity } }, { session });
        if (result.matchedCount !== 1) {
          throw new HttpError(409, 'Could not restore all inventory. Cancellation was rolled back.', undefined, 'INVENTORY_RESTORE_FAILED');
        }
      }
    }
    return order;
  });
}

async function updateStatusWithCompensation(id: string, status: OrderStatus) {
  const current = await Order.findById(id).lean();
  if (!current) throw new HttpError(404, 'Order not found', undefined, 'ORDER_NOT_FOUND');
  if (current.status === status) return current;
  assertTransition(current.status, status);

  const order = await Order.findOneAndUpdate(
    { _id: id, status: current.status },
    { $set: { status } },
    { returnDocument: 'after' }
  );
  if (!order) {
    throw new HttpError(409, 'Order status changed in another request. Refresh and try again.', undefined, 'ORDER_STATUS_CHANGED');
  }
  if (status !== 'cancelled') return order;

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
  if (restored.some((result) => result.status === 'rejected')) {
    await Promise.allSettled(successful.map((item) => Book.updateOne({ _id: item.book }, { $inc: { stock: -item.quantity } })));
    await Order.updateOne({ _id: id, status: 'cancelled' }, { $set: { status: current.status } }).catch(() => undefined);
    throw new HttpError(409, 'Could not restore all inventory. Order cancellation was rolled back.', undefined, 'INVENTORY_RESTORE_FAILED');
  }
  return order;
}

export async function updateStatus(id: string, status: OrderStatus) {
  if (await mongoTransactionsAvailable()) return updateStatusWithTransaction(id, status);
  return updateStatusWithCompensation(id, status);
}
