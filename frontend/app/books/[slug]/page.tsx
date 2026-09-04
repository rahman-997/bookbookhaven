import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BookActions from '@/app/components/BookActions';
import BookCard from '@/app/components/BookCard';
import BookCover from '@/app/components/BookCover';
import { ArrowRightIcon, ChevronLeftIcon, ShieldIcon, SparkleIcon, StarIcon } from '@/app/components/Icons';
import { getBookBySlug, getRelatedBooks, getReviews } from '@/lib/api';
import { siteUrl } from '@/lib/site';
import ReviewPanel from './ReviewPanel';

function categoryLabel(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: 'Book not found', robots: { index: false, follow: false } };
  const description = book.description.slice(0, 160) || `${book.title} by ${book.author} at BookHaven.`;
  return {
    title: book.title,
    description,
    alternates: { canonical: `/books/${book.slug}` },
    openGraph: { title: book.title, description, type: 'book', url: `/books/${book.slug}` },
    twitter: { card: 'summary_large_image', title: book.title, description }
  };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();
  const [reviews, related] = await Promise.all([getReviews(book._id), getRelatedBooks(book)]);
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    description: book.description,
    image: book.coverUrl,
    isbn: book.isbn,
    url: `${siteUrl}/books/${book.slug}`,
    aggregateRating: reviews.count ? { '@type': 'AggregateRating', ratingValue: Number(reviews.averageRating.toFixed(2)), ratingCount: reviews.count, bestRating: 5, worstRating: 1 } : undefined,
    offers: { '@type': 'Offer', priceCurrency: 'USD', price: book.price.toFixed(2), availability: book.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${siteUrl}/books/${book.slug}` }
  }).replace(/</g, '\\u003c');

  return <main className="page-shell pb-28 pt-7 md:pb-20 md:pt-10">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-amber-100"><ChevronLeftIcon size={17}/> Back to library</Link>
      <span className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-slate-600 sm:flex"><span className="status-dot" aria-hidden="true"/> Live inventory</span>
    </nav>

    <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(300px,430px)_1fr] lg:gap-16">
      <div className="relative mx-auto w-full max-w-[430px] lg:sticky lg:top-28 lg:self-start">
        <div className="absolute -inset-12 -z-10 rounded-full bg-violet-500/10 blur-3xl" />
        <BookCover book={book} className="w-full" priority />
        <div className="mt-5 grid grid-cols-3 gap-2"><div className="metric text-center"><p className="metric__label">Stock</p><p className="mt-1 text-lg font-black">{book.stock}</p></div><div className="metric text-center"><p className="metric__label">Rating</p><p className="mt-1 text-lg font-black">{reviews.count ? reviews.averageRating.toFixed(1) : '—'}</p></div><div className="metric text-center"><p className="metric__label">Readers</p><p className="mt-1 text-lg font-black">{reviews.count}</p></div></div>
        {book.isbn ? <div className="mt-3 rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[.13em] text-slate-600">BookHaven edition · ISBN {book.isbn}</div> : null}
      </div>

      <section className="self-center">
        <div className="flex flex-wrap gap-2">{book.featured ? <span className="chip !border-amber-200/20 !text-amber-100"><SparkleIcon size={13}/> Curator select</span> : null}{book.categories.map(category => <Link key={category} href={`/?category=${encodeURIComponent(category)}#library`} className="chip transition hover:border-violet-300/30 hover:text-violet-200">{categoryLabel(category)}</Link>)}</div>
        <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-amber-200/70">{book.author}</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-black leading-[.98] tracking-[-.052em] sm:text-5xl md:text-7xl">{book.title}</h1>
        <p className="mt-5 max-w-2xl text-sm font-semibold uppercase tracking-[.08em] text-slate-600">A BookHaven library edition for readers who keep the useful books close.</p>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3"><span className="text-4xl font-black tracking-[-.045em]">${book.price.toFixed(2)}</span><span className={`chip ${book.stock <= 5 ? '!border-amber-200/20 !text-amber-200' : ''}`}>{book.stock > 0 ? `${book.stock} ready to order` : 'Currently unavailable'}</span><span className="flex items-center gap-1.5 text-sm font-bold text-amber-200"><StarIcon size={16}/>{reviews.count ? `${reviews.averageRating.toFixed(1)} · ${reviews.count} review${reviews.count === 1 ? '' : 's'}` : 'Be the first to review'}</span></div>

        <div className="editorial-card mt-8 p-6 md:p-7"><p className="section-kicker">Why it belongs on the shelf</p><p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-300 md:text-lg">{book.description}</p></div>
        <div className="mt-8"><BookActions bookId={book._id} stock={book.stock} /></div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="editorial-card p-4"><ShieldIcon size={19} className="text-amber-200"/><strong className="mt-3 block text-sm">Private account</strong><span className="mt-1 block text-xs leading-5 text-slate-500">HTTP-only authentication keeps session tokens outside client JavaScript.</span></div>
          <div className="editorial-card p-4"><span className="text-lg text-violet-300">◇</span><strong className="mt-3 block text-sm">Personal shelf</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Wishlist, cart, reviews and orders stay connected to the same reader.</span></div>
          <div className="editorial-card p-4"><span className="text-lg text-emerald-300">↻</span><strong className="mt-3 block text-sm">Checked inventory</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Stock is validated at checkout and compensation protects failed orders.</span></div>
        </div>
      </section>
    </div>

    <ReviewPanel bookId={book._id} initialReviews={reviews.reviews} initialAverage={reviews.averageRating} initialCount={reviews.count} />

    {related.length ? <section className="mt-20 border-t border-white/10 pt-12"><p className="section-kicker">Keep exploring</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-black tracking-[-.04em] md:text-4xl">Related editions</h2><p className="mt-2 text-sm text-slate-500">More books from neighboring shelves and ideas.</p></div><Link href="/#library" className="button button--ghost !min-h-10">Browse all <ArrowRightIcon size={15}/></Link></div><div className="mt-7 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{related.map(item => <BookCard key={item._id} book={item} />)}</div></section> : null}
  </main>;
}
