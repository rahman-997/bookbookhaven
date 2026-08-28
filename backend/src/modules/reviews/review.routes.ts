import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth } from '../auth/auth.middleware';
import * as controller from './review.controller';
import { listReviewsQuerySchema, reviewBookParamsSchema, reviewIdParamsSchema, upsertReviewSchema } from './review.schema';

export const reviewRouter = Router();
reviewRouter.get('/book/:bookId', validateParams(reviewBookParamsSchema), validateQuery(listReviewsQuerySchema), controller.list);
reviewRouter.put('/book/:bookId', requireAuth, validateParams(reviewBookParamsSchema), validateBody(upsertReviewSchema), controller.upsert);
reviewRouter.delete('/:id', requireAuth, validateParams(reviewIdParamsSchema), controller.remove);
