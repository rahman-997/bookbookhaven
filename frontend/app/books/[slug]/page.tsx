import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BookActions from '@/app/components/BookActions';
import BookCover from '@/app/components/BookCover';
import { ChevronLeftIcon, ShieldIcon, SparkleIcon, StarIcon } from '@/app/components/Icons';
import { getBookBySlug, getReviews } from '@/lib/api';
import ReviewPanel from './ReviewPanel';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: 'Book not found | BookHaven' };
  return { title: `${book.title} | BookHaven`, description: book.description.slice(0, 160) };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();
  const reviews = await getReviews(book._id);

  return <main className="page-shell pb-28 pt-8 md:pb-20 md:pt-12">
    <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-amber-100"><ChevronLeftIcon size={17}/> Back to library</Link>
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(280px,410px)_1fr] lg:gap-16">
      <div className="relative mx-auto w-full max-w-[410px]">
        <div className="absolute -inset-10 -z-10 rounded-full bg-violet-500/8 blur-3xl" />
        <BookCover book={book} className="w-full" />
        <div className="mt-5 grid grid-cols-3 gap-2"><div className="metric text-center"><p className="metric__label">Stock</p><p className="mt-1 font-black">{book.stock}</p></div><div className="metric text-center"><p className="metric__label">Rating</p><p className="mt-1 font-black">{reviews.count ? reviews.averageRating.toFixed(1) : '—'}</p></div><div className="metric text-center"><p className="metric__label">Reviews</p><p className="mt-1 font-black">{reviews.count}</p></div></div>
      </div>
      <section className="self-center">
        <div className="flex flex-wrap gap-2">{book.featured ? <span className="chip !border-amber-200/20 !text-amber-100"><SparkleIcon size={13}/> Editor’s pick</span> : null}{book.categories.map(category => <span key={category} className="chip">{category}</span>)}</div>
        <p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-amber-200/70">{book.author}</p>
        <h1 className="mt-2 text-4xl font-black leading-[1.02] tracking-[-.045em] sm:text-5xl md:text-6xl">{book.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3"><span className="text-3xl font-black tracking-tight">${book.price.toFixed(2)}</span><span className={`chip ${book.stock <= 5 ? '!text-amber-200' : ''}`}>{book.stock > 0 ? `${book.stock} ready to ship` : 'Currently unavailable'}</span><span className="flex items-center gap-1.5 text-sm font-bold text-amber-200"><StarIcon size={16}/>{reviews.count ? `${reviews.averageRating.toFixed(1)} · ${reviews.count} reader${reviews.count === 1 ? '' : 's'}` : 'Be the first to review'}</span></div>
        <p className="mt-8 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-300 md:text-lg">{book.description}</p>
        {book.isbn ? <p className="mt-4 text-xs font-semibold uppercase tracking-[.12em] text-slate-600">ISBN {book.isbn}</p> : null}
        <div className="mt-8"><BookActions bookId={book._id} stock={book.stock} /></div>
        <div className="glass mt-10 grid gap-0 overflow-hidden rounded-2xl sm:grid-cols-3">
          <div className="p-4"><ShieldIcon size={19} className="text-amber-200"/><strong className="mt-3 block text-sm">Private session</strong><span className="text-xs leading-5 text-slate-500">HTTP-only authentication</span></div>
          <div className="border-white/10 p-4 sm:border-l"><span className="text-lg text-violet-300">◇</span><strong className="mt-3 block text-sm">Saved library</strong><span className="text-xs leading-5 text-slate-500">Wishlist tied to your account</span></div>
          <div className="border-white/10 p-4 sm:border-l"><span className="text-lg text-emerald-300">↻</span><strong className="mt-3 block text-sm">Live inventory</strong><span className="text-xs leading-5 text-slate-500">Stock validated at checkout</span></div>
        </div>
      </section>
    </div>
    <ReviewPanel bookId={book._id} initialReviews={reviews.reviews} initialAverage={reviews.averageRating} initialCount={reviews.count} />
  </main>;
}
