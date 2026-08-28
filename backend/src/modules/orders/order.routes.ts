import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import * as controller from './order.controller';
import { createOrderSchema, listAdminOrdersQuerySchema, orderIdParamsSchema, updateOrderStatusSchema } from './order.schema';

export const orderRouter = Router();
orderRouter.use(requireAuth);
orderRouter.get('/', controller.listMine);
orderRouter.post('/', validateBody(createOrderSchema), controller.create);
orderRouter.get('/admin/all', requireRole('admin'), validateQuery(listAdminOrdersQuerySchema), controller.listAll);
orderRouter.patch('/admin/:id/status', requireRole('admin'), validateParams(orderIdParamsSchema), validateBody(updateOrderStatusSchema), controller.updateStatus);
orderRouter.get('/:id', validateParams(orderIdParamsSchema), controller.getMine);
