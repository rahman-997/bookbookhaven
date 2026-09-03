'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Book } from '@/lib/types';
import BookCover from '@/app/components/BookCover';
import EmptyState from '@/app/components/EmptyState';
import { ArrowRightIcon, CartIcon, HeartIcon, TrashIcon } from '@/app/components/Icons';

export default function WishlistPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [message, setMessage] = useState('Loading your saved shelf…');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/backend/wishlist', { cache: 'no-store' }); if (r.status === 401) { setBooks([]); setMessage('Sign in to use your wishlist.'); return; } if (!r.ok) { setMessage('Could not load your wishlist.'); return; } const p = await r.json(); setBooks(p.data?.books ?? []); setMessage(''); }, []);
  useEffect(() => { void load(); }, [load]);
  async function remove(id: string) { setBusy(id); await fetch(`/api/backend/wishlist/${id}`, { method: 'DELETE' }); await load(); setBusy(''); }
  async function cart(id: string) { setBusy(id); const r = await fetch('/api/backend/cart/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookId: id, quantity: 1 }) }); if (r.ok) window.dispatchEvent(new Event('bookhaven:cart-changed')); await load(); setBusy(''); }

  return <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Saved shelf</p><h1 className="mt-2 max-w-3xl text-4xl font-black tracking-[-.045em] md:text-6xl">Books worth coming back to.</h1><p className="mt-3 text-sm text-slate-500">A private shortlist that stays tied to your reader account.</p></div><Link href="/#library" className="button button--ghost">Browse library <ArrowRightIcon size={15}/></Link></div>
    {message ? <div aria-live="polite" className="notice mt-8">{message} {message.startsWith('Sign') ? <Link href="/login" className="ml-2 font-bold text-amber-200 underline underline-offset-4">Sign in</Link> : null}</div> : null}

    {!message && books.length ? <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{books.map(book => <article key={book._id} className="editorial-card flex gap-5 p-4">
      <Link href={`/books/${book.slug}`} className="w-24 shrink-0 sm:w-28"><BookCover book={book} /></Link>
      <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black uppercase tracking-[.15em] text-violet-300/70">{book.categories[0]?.replace(/[-_]+/g, ' ') ?? 'BookHaven edition'}</p><Link href={`/books/${book.slug}`}><h2 className="mt-1 line-clamp-2 text-lg font-black leading-tight tracking-tight hover:text-amber-100">{book.title}</h2></Link><p className="mt-1 truncate text-xs text-slate-500">{book.author}</p><p className="mt-3 text-2xl font-black tracking-tight">${book.price.toFixed(2)}</p><p className={`mt-1 text-[10px] font-bold uppercase tracking-[.08em] ${book.stock <= 5 ? 'text-amber-300' : 'text-slate-600'}`}>{book.stock ? `${book.stock} in stock` : 'Sold out'}</p><div className="mt-4 flex gap-2"><button disabled={busy === book._id || book.stock < 1} onClick={() => cart(book._id)} className="button button--primary !min-h-9 !px-3 !py-1.5"><CartIcon size={15}/> Add</button><button disabled={busy === book._id} onClick={() => remove(book._id)} className="button button--ghost !min-h-9 !px-2.5 !py-1.5" aria-label={`Remove ${book.title}`}><TrashIcon size={15}/></button></div></div>
    </article>)}</div> : null}
    {!message && books.length === 0 ? <div className="mt-10"><EmptyState title="Your saved shelf is empty" description="Tap the heart on any title and it will wait for you here." icon={<HeartIcon size={27}/>} /></div> : null}
  </main>;
}
