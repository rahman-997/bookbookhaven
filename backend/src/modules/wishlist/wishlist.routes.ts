import { Router } from 'express';
import { validateParams } from '../../middleware/validate';
import { requireAuth } from '../auth/auth.middleware';
import * as controller from './wishlist.controller';
import { wishlistBookParamsSchema } from './wishlist.schema';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);
wishlistRouter.get('/', controller.get);
wishlistRouter.post('/:bookId', validateParams(wishlistBookParamsSchema), controller.add);
wishlistRouter.delete('/:bookId', validateParams(wishlistBookParamsSchema), controller.remove);
