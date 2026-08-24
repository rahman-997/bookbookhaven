import type { Book, Review } from './types';

export const internalApiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:3001/api/v1';

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${internalApiUrl}${path}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function getBooks(query = ''): Promise<Book[]> {
  const suffix = query ? `?${query}` : '?limit=50&sort=newest';
  const payload = await getJson<{ data?: Book[] }>(`/books${suffix}`);
  return payload?.data ?? [];
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const payload = await getJson<{ data?: Book }>(`/books/slug/${encodeURIComponent(slug)}`);
  return payload?.data ?? null;
}

export async function getReviews(bookId: string): Promise<{ reviews: Review[]; averageRating: number; count: number }> {
  const payload = await getJson<{ data?: Review[]; meta?: { averageRating?: number; count?: number } }>(`/reviews/book/${bookId}`);
  return {
    reviews: payload?.data ?? [],
    averageRating: payload?.meta?.averageRating ?? 0,
    count: payload?.meta?.count ?? 0
  };
}
