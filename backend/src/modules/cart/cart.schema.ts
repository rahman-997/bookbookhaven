import { z } from 'zod';
import { objectIdSchema } from '../../utils/object-id';

export const addCartItemSchema = z.object({
  bookId: objectIdSchema,
  quantity: z.number().int().min(1).max(99).default(1)
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99)
});

export const cartBookParamsSchema = z.object({ bookId: objectIdSchema });
