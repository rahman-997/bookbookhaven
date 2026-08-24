import Link from 'next/link';
import type { Book } from '@/lib/types';
import BookActions from './BookActions';
import BookCover from './BookCover';
import { StarIcon } from './Icons';

export default function BookCard({ book }: { book: Book }) {
  return <article className="book-card group min-w-0">
    <div className="relative mx-auto w-[88%] sm:w-full">
      <Link href={`/books/${book.slug}`} className="book-card__media block" aria-label={`Open ${book.title}`}>
        <BookCover book={book} />
        {book.featured ? <span className="absolute left-3 top-3 z-[4] rounded-full border border-amber-100/15 bg-[#17130c]/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-amber-200 backdrop-blur">Editor’s pick</span> : null}
        {book.stock < 1 ? <span className="absolute bottom-3 left-3 z-[4] rounded-full bg-rose-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Sold out</span> : null}
      </Link>
    </div>
    <div className="px-1 pb-2 pt-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-bold uppercase tracking-[.16em] text-amber-200/75">{book.author}</p><Link href={`/books/${book.slug}`}><h2 className="mt-1.5 line-clamp-2 text-lg font-black leading-tight tracking-[-.025em] text-slate-100 transition group-hover:text-amber-100">{book.title}</h2></Link></div><div className="mt-0.5 flex shrink-0 items-center gap-1 text-xs text-slate-500"><StarIcon size={13}/><span>{book.featured ? 'Pick' : 'Read'}</span></div></div>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{book.description || 'A new title waiting to be discovered.'}</p>
      <div className="mt-4 flex items-center justify-between gap-3"><div><span className="text-xl font-black tracking-tight text-white">${book.price.toFixed(2)}</span><p className={`mt-0.5 text-[11px] ${book.stock <= 5 ? 'text-amber-300/75' : 'text-slate-600'}`}>{book.stock > 0 ? `${book.stock} available` : 'Unavailable'}</p></div><BookActions bookId={book._id} stock={book.stock} compact /></div>
    </div>
  </article>;
}
