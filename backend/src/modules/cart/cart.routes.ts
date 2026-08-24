import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../auth/auth.middleware';
import * as controller from './cart.controller';
import { addCartItemSchema, cartBookParamsSchema, updateCartItemSchema } from './cart.schema';

export const cartRouter = Router();
cartRouter.use(requireAuth);
cartRouter.get('/', controller.get);
cartRouter.post('/items', validateBody(addCartItemSchema), controller.add);
cartRouter.patch('/items/:bookId', validateParams(cartBookParamsSchema), validateBody(updateCartItemSchema), controller.update);
cartRouter.delete('/items/:bookId', validateParams(cartBookParamsSchema), controller.remove);
cartRouter.delete('/', controller.clear);
