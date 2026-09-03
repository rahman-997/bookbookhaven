import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import * as controller from './book.controller';
import { bookIdParamsSchema, bookSlugParamsSchema, createBookSchema, listBooksQuerySchema, updateBookSchema } from './book.schema';

export const bookRouter = Router();
bookRouter.get('/', validateQuery(listBooksQuerySchema), controller.list);
bookRouter.get('/facets', controller.facets);
bookRouter.get('/slug/:slug', validateParams(bookSlugParamsSchema), controller.getBySlug);
bookRouter.get('/:id', validateParams(bookIdParamsSchema), controller.get);
bookRouter.post('/', requireAuth, requireRole('admin'), validateBody(createBookSchema), controller.create);
bookRouter.patch('/:id', requireAuth, requireRole('admin'), validateParams(bookIdParamsSchema), validateBody(updateBookSchema), controller.update);
bookRouter.delete('/:id', requireAuth, requireRole('admin'), validateParams(bookIdParamsSchema), controller.remove);
