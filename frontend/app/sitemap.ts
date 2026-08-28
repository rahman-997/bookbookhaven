import type { MetadataRoute } from 'next';
import { getBooksPage } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const books = [] as Awaited<ReturnType<typeof getBooksPage>>['items'];
  let page = 1;
  let pages = 1;
  do {
    const result = await getBooksPage(`page=${page}&limit=100&sort=newest`);
    books.push(...result.items);
    pages = result.pagination.pages;
    page += 1;
  } while (page <= pages && page <= 100);

  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    ...books.map(book => ({ url: `${base}/books/${book.slug}`, lastModified: book.updatedAt ? new Date(book.updatedAt) : undefined, changeFrequency: 'weekly' as const, priority: 0.8 }))
  ];
}
