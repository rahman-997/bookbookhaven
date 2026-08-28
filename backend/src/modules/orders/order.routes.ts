import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import * as controller from './order.controller';
import {
  adminListOrdersQuerySchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamsSchema,
  updateOrderStatusSchema
} from './order.schema';

export const orderRouter = Router();
orderRouter.use(requireAuth);
orderRouter.get('/', validateQuery(listOrdersQuerySchema), controller.listMine);
orderRouter.post('/', validateBody(createOrderSchema), controller.create);
orderRouter.get('/admin/all', requireRole('admin'), validateQuery(adminListOrdersQuerySchema), controller.listAll);
orderRouter.patch('/admin/:id/status', requireRole('admin'), validateParams(orderIdParamsSchema), validateBody(updateOrderStatusSchema), controller.updateStatus);
orderRouter.get('/:id', validateParams(orderIdParamsSchema), controller.getMine);
