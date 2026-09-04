import type { Book } from '@/lib/types';

function toneFor(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 8;
}

function monogram(title: string) {
  const words = title.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const meaningful = words.filter((word) => !['the', 'a', 'an', 'of', 'and', 'with'].includes(word.toLowerCase()));
  const source = meaningful.length ? meaningful : words;
  return source.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'BH';
}

function label(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function BookCover({ book, className = '', priority = false }: { book: Book; className?: string; priority?: boolean }) {
  if (book.coverUrl) {
    return <div className={`book-cover book-cover--image ${className}`}>
      <img
        src={book.coverUrl}
        alt={`${book.title} book cover`}
        className="h-full w-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>;
  }

  const tone = toneFor(book.slug || book.title);
  const primaryCategory = book.categories[0] ? label(book.categories[0]) : 'BookHaven edition';
  const editionReference = book.isbn ? book.isbn.slice(-6) : 'BOOKHAVEN';

  return <div className={`book-cover book-cover--edition cover-tone-${tone} ${className}`} role="img" aria-label={`${book.title} by ${book.author}, BookHaven edition cover`}>
    <span className="book-cover__halo" aria-hidden="true" />
    <span className="book-cover__grid" aria-hidden="true" />
    <div className="book-cover__content">
      <div className="book-cover__topline">
        <span className="book-cover__mark">BH</span>
        <span>{primaryCategory}</span>
      </div>
      <div className="book-cover__center">
        <span className="book-cover__monogram" aria-hidden="true">{monogram(book.title)}</span>
        <span className="book-cover__title">{book.title}</span>
        <span className="book-cover__author">{book.author}</span>
      </div>
      <div className="book-cover__footer">
        <span>{book.featured ? 'Curator select' : 'Library edition'}</span>
        <span>{book.isbn ? `Ref ${editionReference}` : editionReference}</span>
      </div>
    </div>
  </div>;
}
