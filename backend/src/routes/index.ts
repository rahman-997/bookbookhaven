import { Router } from 'express';
import { adminRouter } from '../modules/admin/admin.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { bookRouter } from '../modules/books/book.routes';
import { cartRouter } from '../modules/cart/cart.routes';
import { healthRouter } from '../modules/health/health.routes';
import { orderRouter } from '../modules/orders/order.routes';
import { reviewRouter } from '../modules/reviews/review.routes';
import { wishlistRouter } from '../modules/wishlist/wishlist.routes';

export const apiRouter = Router();
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/books', bookRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/reviews', reviewRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/admin', adminRouter);
