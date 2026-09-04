import type { MetadataRoute } from 'next';
import { getBooksPage } from '@/lib/api';
import { siteUrl } from '@/lib/site';

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = [] as Awaited<ReturnType<typeof getBooksPage>>['items'];
  let page = 1;
  let pages = 1;

  do {
    const result = await getBooksPage(`page=${page}&limit=${PAGE_SIZE}&sort=newest`);
    books.push(...result.items);
    pages = Math.min(Math.max(result.pagination.pages, 1), MAX_PAGES);
    page += 1;
  } while (page <= pages);

  const seen = new Set<string>();
  const bookEntries: MetadataRoute.Sitemap = [];

  for (const book of books) {
    if (!book.slug || seen.has(book.slug)) continue;
    seen.add(book.slug);
    const lastModified = book.updatedAt ?? book.createdAt;
    bookEntries.push({
      url: `${siteUrl}/books/${encodeURIComponent(book.slug)}`,
      lastModified: lastModified ? new Date(lastModified) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8
    });
  }

  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    ...bookEntries
  ];
}
