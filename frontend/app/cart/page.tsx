'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { CartItem } from '@/lib/types';
import BookCover from '@/app/components/BookCover';
import EmptyState from '@/app/components/EmptyState';
import { BagIcon, MinusIcon, PlusIcon, ShieldIcon, TrashIcon } from '@/app/components/Icons';

type Cart = { items: CartItem[]; subtotal: number };
export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/backend/cart', { cache: 'no-store' }); if (r.status === 401) { setError('Please sign in to view your cart.'); setCart(null); return; } if (!r.ok) { setError('Could not load your cart.'); return; } const p = await r.json(); setCart(p.data); setError(''); }, []);
  useEffect(() => { void load(); }, [load]);
  async function mutate(id: string, options: RequestInit) { setBusy(id); setError(''); const r = await fetch(`/api/backend/cart/items/${id}`, options); if (!r.ok) { const p = await r.json().catch(() => null); setError(p?.error?.message ?? 'Could not update cart.'); } await load(); window.dispatchEvent(new Event('bookhaven:cart-changed')); setBusy(''); }
  const count = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Your selection</p><h1 className="mt-2 max-w-3xl text-4xl font-black tracking-[-.045em] md:text-6xl">Build the stack before the next chapter.</h1><p className="mt-3 text-sm text-slate-500">{count} item{count === 1 ? '' : 's'} currently in your cart.</p></div><Link href="/#library" className="button button--ghost">Keep browsing</Link></div>
    {error ? <div role="alert" className="notice notice--error mt-7">{error} {error.startsWith('Please') ? <Link href="/login" className="ml-2 font-bold underline">Sign in</Link> : null}</div> : null}

    {cart ? cart.items.length ? <div className="mt-9 grid gap-7 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3" aria-label="Cart items">{cart.items.map(item => <article key={item.book._id} className="editorial-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <Link href={`/books/${item.book.slug}`} className="w-24 shrink-0"><BookCover book={item.book} /></Link>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-300/70">BookHaven edition</p><Link href={`/books/${item.book.slug}`} className="mt-1 block text-lg font-black tracking-tight hover:text-amber-100">{item.book.title}</Link><p className="mt-1 text-xs text-slate-500">{item.book.author} · ${item.unitPrice.toFixed(2)} each</p><p className="mt-2 text-xs text-slate-600">{item.book.stock} currently in stock</p></div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1" aria-label={`Quantity for ${item.book.title}`}><button disabled={busy === item.book._id || item.quantity <= 1} onClick={() => mutate(item.book._id, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({quantity:item.quantity-1}) })} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/5" aria-label="Decrease quantity"><MinusIcon size={15}/></button><span className="w-8 text-center text-sm font-black" aria-live="polite">{item.quantity}</span><button disabled={busy === item.book._id || item.quantity >= item.book.stock} onClick={() => mutate(item.book._id, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({quantity:item.quantity+1}) })} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/5" aria-label="Increase quantity"><PlusIcon size={15}/></button></div>
          <button disabled={busy === item.book._id} onClick={() => mutate(item.book._id,{method:'DELETE'})} className="button button--ghost !min-h-10 !px-3" aria-label={`Remove ${item.book.title}`}><TrashIcon size={15}/></button>
        </div>
      </article>)}</section>
      <aside className="surface h-fit rounded-[1.6rem] p-6 lg:sticky lg:top-28"><p className="section-kicker">Order preview</p><h2 className="mt-2 text-2xl font-black tracking-tight">Your reading stack</h2><div className="mt-6 flex items-center justify-between text-sm text-slate-400"><span>{count} items</span><span>Inventory rechecked at checkout</span></div><div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5"><span className="text-sm text-slate-400">Subtotal</span><strong className="text-4xl tracking-[-.04em]">${cart.subtotal.toFixed(2)}</strong></div><Link href="/checkout" className="button button--primary mt-6 w-full"><BagIcon size={17}/> Continue to checkout</Link><p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><ShieldIcon size={15} className="mt-0.5 shrink-0"/> Cart state belongs to your account and stock is validated again when the order is placed.</p></aside>
    </div> : <div className="mt-10"><EmptyState title="Your cart is beautifully empty" description="Explore the library and add something worth making time for." icon={<BagIcon size={27}/>} /></div> : null}
  </main>;
}
