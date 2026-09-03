import Link from 'next/link';
import type { Book } from '@/lib/types';
import BookActions from './BookActions';
import BookCover from './BookCover';
import { ArrowRightIcon, StarIcon } from './Icons';

function categoryLabel(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function BookCard({ book }: { book: Book }) {
  const primaryCategory = book.categories[0] ? categoryLabel(book.categories[0]) : 'BookHaven';
  return <article className="book-card group min-w-0">
    <div className="editorial-card h-full p-3.5 sm:p-4">
      <div className="relative mx-auto w-[88%] sm:w-full">
        <Link href={`/books/${book.slug}`} className="book-card__media block" aria-label={`Open ${book.title}`}>
          <BookCover book={book} />
          {book.featured ? <span className="absolute left-3 top-3 z-[6] rounded-full border border-amber-100/15 bg-[#17130c]/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-amber-200 backdrop-blur">Curator select</span> : null}
          {book.stock < 1 ? <span className="absolute bottom-3 left-3 z-[6] rounded-full bg-rose-500/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">Sold out</span> : null}
        </Link>
      </div>

      <div className="px-1 pb-1 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-violet-300/80">{primaryCategory}</span>
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-slate-600"><StarIcon size={12}/>{book.featured ? 'Selected' : 'Library'}</span>
        </div>
        <p className="mt-2 truncate text-[11px] font-bold uppercase tracking-[.14em] text-amber-200/70">{book.author}</p>
        <Link href={`/books/${book.slug}`} className="group/title block"><h2 className="mt-1.5 line-clamp-2 min-h-[2.7rem] text-xl font-black leading-[1.08] tracking-[-.035em] text-slate-100 transition group-hover/title:text-amber-100">{book.title}</h2></Link>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{book.description || 'A new title waiting to be discovered.'}</p>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/[.07] pt-4">
          <div><span className="text-xl font-black tracking-tight text-white">${book.price.toFixed(2)}</span><p className={`mt-0.5 text-[10px] font-bold uppercase tracking-[.08em] ${book.stock <= 5 ? 'text-amber-300/75' : 'text-slate-600'}`}>{book.stock > 0 ? `${book.stock} in stock` : 'Unavailable'}</p></div>
          <Link href={`/books/${book.slug}`} aria-label={`Read about ${book.title}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-400 transition hover:border-amber-200/25 hover:text-amber-100"><ArrowRightIcon size={16}/></Link>
        </div>
        <div className="mt-3"><BookActions bookId={book._id} stock={book.stock} compact /></div>
      </div>
    </div>
  </article>;
}
