import { z } from 'zod';
import { objectIdSchema } from '../../utils/object-id';

export const reviewBookParamsSchema = z.object({ bookId: objectIdSchema });
export const reviewIdParamsSchema = z.object({ id: objectIdSchema });
export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
export const upsertReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default('')
});
