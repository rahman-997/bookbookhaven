import type { MetadataRoute } from 'next';
import { getBooks } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const books = await getBooks('limit=100&sort=newest');
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/wishlist`, changeFrequency: 'weekly', priority: 0.4 },
    ...books.map(book => ({ url: `${base}/books/${book.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 }))
  ];
}
