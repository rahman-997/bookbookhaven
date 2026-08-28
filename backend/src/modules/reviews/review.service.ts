import { Types } from 'mongoose';
import { HttpError } from '../../errors/http-error';
import { Book } from '../books/book.model';
import { Review } from './review.model';

export async function listForBook(bookId: string, input: { page: number; limit: number }) {
  const [reviews, summary, total] = await Promise.all([
    Review.find({ book: bookId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .lean(),
    Review.aggregate([
      { $match: { book: new Types.ObjectId(bookId) } },
      { $group: { _id: '$book', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]),
    Review.countDocuments({ book: bookId })
  ]);
  return {
    reviews,
    summary: summary[0] ?? { averageRating: 0, count: 0 },
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.max(1, Math.ceil(total / input.limit))
    }
  };
}

export async function upsert(userId: string, bookId: string, input: { rating: number; comment: string }) {
  const exists = await Book.exists({ _id: bookId });
  if (!exists) throw new HttpError(404, 'Book not found');
  return Review.findOneAndUpdate(
    { user: userId, book: bookId },
    { $set: input },
    { upsert: true, returnDocument: 'after', runValidators: true }
  ).populate('user', 'name');
}

export async function remove(userId: string, role: 'customer' | 'admin', id: string) {
  const review = await Review.findById(id);
  if (!review) throw new HttpError(404, 'Review not found');
  if (role !== 'admin' && String(review.user) !== userId) throw new HttpError(403, 'Cannot delete another user review');
  await review.deleteOne();
}
