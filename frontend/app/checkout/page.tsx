'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CartItem } from '@/lib/types';
import BookCover from '@/app/components/BookCover';
import { BagIcon, CheckIcon, ShieldIcon } from '@/app/components/Icons';

type Cart = { items: CartItem[]; subtotal: number };

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState('Loading your order…');
  const [busy, setBusy] = useState(false);
  const messageIsError = message.startsWith('Could') || message.startsWith('Connection');

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/backend/cart', { cache: 'no-store' });
      if (response.status === 401) { setMessage('Sign in before checkout.'); return; }
      if (!response.ok) { setMessage('Could not load your cart.'); return; }
      const payload = await response.json();
      setCart(payload.data);
      setMessage('');
    })();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/backend/orders', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ shippingAddress: String(form.get('shippingAddress') ?? ''), paymentMethod: String(form.get('paymentMethod') ?? 'cash_on_delivery') })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setMessage(payload?.error?.message ?? 'Could not place order.'); setBusy(false); return; }
      window.dispatchEvent(new Event('bookhaven:cart-changed'));
      router.push('/orders');
      router.refresh();
    } catch { setMessage('Connection problem. Try again.'); setBusy(false); }
  }

  return <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
    <div className="flex flex-wrap items-end justify-between gap-4"><div className="max-w-3xl"><p className="section-kicker">Checkout</p><h1 className="mt-2 text-4xl font-black tracking-[-.045em] md:text-6xl">Turn the stack into an order.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">A deliberately simple finish: delivery details, an offline-friendly payment choice, live inventory validation and an account-bound order record.</p></div><span className="chip"><ShieldIcon size={14}/> Inventory protected</span></div>
    {message ? <div role={messageIsError ? 'alert' : 'status'} aria-live={messageIsError ? 'assertive' : 'polite'} aria-atomic="true" className={`notice mt-8 ${messageIsError ? 'notice--error' : ''}`}>{message} {message.startsWith('Sign') ? <Link href="/login" className="ml-2 font-bold text-amber-200 underline">Sign in</Link> : null}</div> : null}

    {cart ? <div className="mt-9 grid gap-7 xl:grid-cols-[1fr_390px]">
      <form onSubmit={submit} aria-busy={busy} className="surface rounded-[1.8rem] p-6 md:p-8">
        <div className="flex items-center gap-4"><span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl border border-violet-300/15 bg-violet-500/10 text-sm font-black text-violet-300">01</span><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">Delivery</p><h2 className="mt-1 text-xl font-black tracking-tight">Where should this stack arrive?</h2></div></div>
        <label className="mt-6 block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-slate-500">Shipping address</span><textarea required minLength={10} maxLength={500} autoComplete="street-address" name="shippingAddress" rows={6} placeholder="Street, city, postal code, country" className="field resize-y" /></label>

        <div className="mt-8 border-t border-white/[.08] pt-8"><div className="flex items-center gap-4"><span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl border border-amber-200/15 bg-amber-400/10 text-sm font-black text-amber-200">02</span><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">Settlement</p><h2 id="payment-method-heading" className="mt-1 text-xl font-black tracking-tight">Choose the free payment path.</h2></div></div>
          <div role="radiogroup" aria-labelledby="payment-method-heading" className="mt-5 grid gap-3 sm:grid-cols-2"><label className="editorial-card cursor-pointer p-4 transition has-[:checked]:border-amber-200/30 has-[:checked]:bg-amber-200/[.04]"><input defaultChecked name="paymentMethod" value="cash_on_delivery" type="radio" className="mr-2"/><strong className="text-sm">Cash on delivery</strong><p className="mt-2 text-xs leading-5 text-slate-500">Pay when the order reaches you.</p></label><label className="editorial-card cursor-pointer p-4 transition has-[:checked]:border-violet-300/30 has-[:checked]:bg-violet-300/[.04]"><input name="paymentMethod" value="manual" type="radio" className="mr-2"/><strong className="text-sm">Manual settlement</strong><p className="mt-2 text-xs leading-5 text-slate-500">Handle payment outside BookHaven.</p></label></div>
        </div>

        <div className="editorial-card mt-8 flex items-start gap-3 p-4"><ShieldIcon size={18} className="mt-0.5 shrink-0 text-emerald-300"/><p className="text-xs leading-5 text-slate-500">Checkout locks the cart, validates stock, snapshots title and price, decrements inventory exactly once and compensates safely if the order cannot complete.</p></div>
        <button type="submit" disabled={busy || cart.items.length === 0} className="button button--primary mt-7 w-full"><CheckIcon size={17}/>{busy ? 'Placing order…' : 'Place order securely'}</button>
      </form>

      <aside className="surface h-fit rounded-[1.8rem] p-5 xl:sticky xl:top-28" aria-label="Order summary"><div className="flex items-center justify-between"><div><p className="section-kicker">Order preview</p><h2 className="mt-1 text-xl font-black tracking-tight">The final stack</h2></div><BagIcon size={20} className="text-amber-200"/></div><div className="mt-6 space-y-4">{cart.items.map(item => <div key={item.book._id} className="flex gap-3 border-b border-white/[.07] pb-4 last:border-0 last:pb-0"><div className="w-14 shrink-0"><BookCover book={item.book}/></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-black leading-tight text-slate-200">{item.book.title}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.08em] text-slate-600">{item.quantity} × ${item.unitPrice.toFixed(2)}</p></div><strong className="text-sm">${(item.quantity * item.unitPrice).toFixed(2)}</strong></div>)}</div><div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5"><span className="text-sm text-slate-500">Total</span><span className="text-4xl font-black tracking-[-.04em]">${cart.subtotal.toFixed(2)}</span></div><p className="mt-5 flex gap-2 text-xs leading-5 text-slate-600"><ShieldIcon size={15} className="mt-0.5 shrink-0"/> Your resulting order stays visible in the order journal.</p></aside>
    </div> : null}
  </main>;
}
