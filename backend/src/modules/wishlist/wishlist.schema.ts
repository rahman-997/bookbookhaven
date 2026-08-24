import { z } from 'zod';
import { objectIdSchema } from '../../utils/object-id';

export const wishlistBookParamsSchema = z.object({ bookId: objectIdSchema });
