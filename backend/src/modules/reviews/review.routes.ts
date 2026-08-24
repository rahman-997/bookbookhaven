import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validate';
import { requireAuth } from '../auth/auth.middleware';
import * as controller from './review.controller';
import { reviewBookParamsSchema, reviewIdParamsSchema, upsertReviewSchema } from './review.schema';

export const reviewRouter = Router();
reviewRouter.get('/book/:bookId', validateParams(reviewBookParamsSchema), controller.list);
reviewRouter.put('/book/:bookId', requireAuth, validateParams(reviewBookParamsSchema), validateBody(upsertReviewSchema), controller.upsert);
reviewRouter.delete('/:id', requireAuth, validateParams(reviewIdParamsSchema), controller.remove);
