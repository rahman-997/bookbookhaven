import type { Book, Review } from './types';

export const internalApiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:3001/api/v1';

type Pagination = { page: number; limit: number; total: number; pages: number };
export type CatalogFacets = {
  categories: Array<{ name: string; count: number }>;
  price: { min: number; max: number };
  total: number;
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${internalApiUrl}${path}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function getBooksPage(query = ''): Promise<{ items: Book[]; pagination: Pagination }> {
  const suffix = query ? `?${query}` : '?limit=24&sort=newest';
  const payload = await getJson<{ data?: Book[]; meta?: Partial<Pagination> }>(`/books${suffix}`);
  const items = payload?.data ?? [];
  return {
    items,
    pagination: {
      page: payload?.meta?.page ?? 1,
      limit: payload?.meta?.limit ?? items.length,
      total: payload?.meta?.total ?? items.length,
      pages: payload?.meta?.pages ?? 1
    }
  };
}

export async function getBooks(query = ''): Promise<Book[]> {
  return (await getBooksPage(query)).items;
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  const payload = await getJson<{ data?: Partial<CatalogFacets> }>('/books/facets');
  return {
    categories: payload?.data?.categories ?? [],
    price: {
      min: payload?.data?.price?.min ?? 0,
      max: payload?.data?.price?.max ?? 0
    },
    total: payload?.data?.total ?? 0
  };
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const payload = await getJson<{ data?: Book }>(`/books/slug/${encodeURIComponent(slug)}`);
  return payload?.data ?? null;
}

export async function getRelatedBooks(book: Book): Promise<Book[]> {
  const query = new URLSearchParams({ limit: '5', sort: 'newest' });
  if (book.categories[0]) query.set('category', book.categories[0]);
  else query.set('author', book.author);
  const books = await getBooks(query.toString());
  return books.filter((item) => item._id !== book._id).slice(0, 4);
}

export async function getReviews(bookId: string): Promise<{ reviews: Review[]; averageRating: number; count: number }> {
  const payload = await getJson<{ data?: Review[]; meta?: { averageRating?: number; count?: number } }>(`/reviews/book/${bookId}?limit=20`);
  return {
    reviews: payload?.data ?? [],
    averageRating: payload?.meta?.averageRating ?? 0,
    count: payload?.meta?.count ?? 0
  };
}
