import type { Book } from '@/lib/types';

export default function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  return <div className={`book-cover ${className}`}>
    {book.coverUrl ? <img src={book.coverUrl} alt={`${book.title} book cover`} className="h-full w-full object-cover" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-violet-500/15 via-slate-900 to-amber-200/10 p-7 text-center"><div><span className="text-5xl">📖</span><span className="mt-4 block text-sm font-black text-slate-300">{book.title}</span></div></div>}
  </div>;
}
