import { HttpError } from '../../errors/http-error';
import { Cart } from '../cart/cart.model';
import { Order } from '../orders/order.model';
import { Review } from '../reviews/review.model';
import { Wishlist } from '../wishlist/wishlist.model';
import { Book } from './book.model';

type ListInput = {
  page: number;
  limit: number;
  search?: string;
  author?: string;
  category?: string;
  featured?: 'true' | 'false';
  minPrice?: number;
  maxPrice?: number;
  sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'title';
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function list(input: ListInput) {
  const filter: Record<string, unknown> = {};
  if (input.search) filter.$text = { $search: input.search };
  if (input.author) filter.author = { $regex: escapeRegex(input.author), $options: 'i' };
  if (input.category) filter.categories = input.category.toLowerCase();
  if (input.featured) filter.featured = input.featured === 'true';
  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    filter.price = {
      ...(input.minPrice !== undefined ? { $gte: input.minPrice } : {}),
      ...(input.maxPrice !== undefined ? { $lte: input.maxPrice } : {})
    };
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    title: { title: 1 }
  } as const;

  const [items, total] = await Promise.all([
    Book.find(filter).sort(sortMap[input.sort]).skip((input.page - 1) * input.limit).limit(input.limit).lean(),
    Book.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.max(1, Math.ceil(total / input.limit))
    }
  };
}

export async function facets() {
  const [result] = await Book.aggregate<{
    categories: Array<{ _id: string; count: number }>;
    price: Array<{ min: number; max: number }>;
    total: Array<{ value: number }>;
  }>([
    {
      $facet: {
        categories: [
          { $unwind: '$categories' },
          { $match: { categories: { $ne: '' } } },
          { $group: { _id: '$categories', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 50 }
        ],
        price: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
        total: [{ $count: 'value' }]
      }
    }
  ]);

  const price = result?.price[0];
  return {
    categories: (result?.categories ?? []).map((item) => ({ name: item._id, count: item.count })),
    price: {
      min: price?.min ?? 0,
      max: price?.max ?? 0
    },
    total: result?.total[0]?.value ?? 0
  };
}

export async function getById(id: string) {
  const book = await Book.findById(id).lean();
  if (!book) throw new HttpError(404, 'Book not found');
  return book;
}

export async function getBySlug(slug: string) {
  const book = await Book.findOne({ slug: slug.toLowerCase() }).lean();
  if (!book) throw new HttpError(404, 'Book not found');
  return book;
}

export async function create(input: Record<string, unknown>) {
  return Book.create(input);
}

export async function update(id: string, input: Record<string, unknown>) {
  const book = await Book.findByIdAndUpdate(id, input, { returnDocument: 'after', runValidators: true }).lean();
  if (!book) throw new HttpError(404, 'Book not found');
  return book;
}

export async function remove(id: string) {
  const activeOrder = await Order.exists({ 'items.book': id, status: { $in: ['pending', 'confirmed'] } });
  if (activeOrder) {
    throw new HttpError(
      409,
      'Book is referenced by an active order and cannot be deleted until fulfillment or cancellation is complete.',
      undefined,
      'BOOK_HAS_ACTIVE_ORDERS'
    );
  }

  const book = await Book.findByIdAndDelete(id).lean();
  if (!book) throw new HttpError(404, 'Book not found', undefined, 'BOOK_NOT_FOUND');
  await Promise.all([
    Review.deleteMany({ book: id }),
    Wishlist.updateMany({}, { $pull: { books: id } }),
    Cart.updateMany({}, { $pull: { items: { book: id } } })
  ]);
  return book;
}
