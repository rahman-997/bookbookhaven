import { z } from 'zod';
import { objectIdSchema } from '../../utils/object-id';

export const createOrderSchema = z.object({
  shippingAddress: z.string().trim().min(10).max(500),
  paymentMethod: z.enum(['cash_on_delivery', 'manual']).default('cash_on_delivery')
});
export const orderIdParamsSchema = z.object({ id: objectIdSchema });
export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'completed', 'cancelled'])
});
