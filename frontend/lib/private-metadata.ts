import type { Metadata } from 'next';

export function privatePageMetadata(title: string, path: string, description: string): Metadata {
  const socialTitle = `${title} · BookHaven`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: false, follow: false },
    openGraph: {
      title: socialTitle,
      description,
      type: 'website',
      url: path
    },
    twitter: {
      card: 'summary',
      title: socialTitle,
      description
    }
  };
}
