import { z } from 'zod';
import { objectIdSchema } from '../../utils/object-id';

function normalizeIsbn(value: string) {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

function isValidIsbn(value: string) {
  if (/^\d{13}$/.test(value)) {
    const total = value.slice(0, 12).split('').reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return (10 - (total % 10)) % 10 === Number(value[12]);
  }
  if (/^\d{9}[\dX]$/.test(value)) {
    const total = value.split('').reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0);
    return total % 11 === 0;
  }
  return false;
}

const bookFields = {
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  author: z.string().trim().min(1).max(160),
  description: z.string().max(5000).default(''),
  coverUrl: z.string().url().refine((value) => { try { return new URL(value).protocol === 'https:'; } catch { return false; } }, { message: 'Cover URL must use HTTPS' }).optional(),
  isbn: z.string().trim().transform(normalizeIsbn).refine(isValidIsbn, { message: 'ISBN must be a valid ISBN-10 or ISBN-13' }).optional(),
  price: z.number().finite().min(0),
  stock: z.number().int().min(0).default(0),
  categories: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  featured: z.boolean().default(false)
};

export const createBookSchema = z.object(bookFields);
export const updateBookSchema = z.object(bookFields).partial().refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });
export const bookIdParamsSchema = z.object({ id: objectIdSchema });
export const bookSlugParamsSchema = z.object({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });
export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  author: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'title']).default('newest')
}).refine((value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice, {
  message: 'minPrice cannot be greater than maxPrice',
  path: ['minPrice']
});
