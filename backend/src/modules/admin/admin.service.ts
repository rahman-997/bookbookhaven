import { User } from '../auth/user.model';
import { Book } from '../books/book.model';
import { Order } from '../orders/order.model';
import { Review } from '../reviews/review.model';

export async function stats() {
  const [books, users, orders, reviews, lowStock, revenueRows, recentOrders] = await Promise.all([
    Book.countDocuments(),
    User.countDocuments(),
    Order.countDocuments(),
    Review.countDocuments(),
    Book.countDocuments({ stock: { $lte: 5 } }),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, revenue: { $sum: '$subtotal' } } }]),
    Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(8).lean()
  ]);
  return { books, users, orders, reviews, lowStock, revenue: revenueRows[0]?.revenue ?? 0, recentOrders };
}
