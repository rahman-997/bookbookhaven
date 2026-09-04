import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/admin', '/cart', '/checkout', '/orders', '/wishlist', '/login', '/register', '/api']
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
