import { z } from 'zod';
import { objectIdSchema } from '../../utils/object-id';

const orderStatusSchema = z.enum(['pending', 'confirmed', 'shipped', 'completed', 'cancelled']);

export const createOrderSchema = z.object({
  shippingAddress: z.string().trim().min(10).max(500),
  paymentMethod: z.enum(['cash_on_delivery', 'manual']).default('cash_on_delivery')
});

export const orderIdParamsSchema = z.object({ id: objectIdSchema });

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: orderStatusSchema.optional()
});

export const adminListOrdersQuerySchema = listOrdersQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().min(1).max(120).optional()
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema
});
