import { HttpError } from '../../errors/http-error';
import { Book } from '../books/book.model';
import { Wishlist } from './wishlist.model';

async function populated(userId: string) {
  const wishlist = await Wishlist.findOne({ user: userId }).populate('books').lean();
  return { id: wishlist?._id ?? null, books: wishlist?.books ?? [] };
}

export async function getWishlist(userId: string) {
  return populated(userId);
}

export async function add(userId: string, bookId: string) {
  const exists = await Book.exists({ _id: bookId });
  if (!exists) throw new HttpError(404, 'Book not found');
  await Wishlist.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId }, $addToSet: { books: bookId } },
    { upsert: true, new: true }
  );
  return populated(userId);
}

export async function remove(userId: string, bookId: string) {
  await Wishlist.findOneAndUpdate({ user: userId }, { $pull: { books: bookId } });
  return populated(userId);
}
