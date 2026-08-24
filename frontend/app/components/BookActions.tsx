'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CartIcon, CheckIcon, HeartIcon } from './Icons';

export default function BookActions({ bookId, stock, compact = false }: { bookId: string; stock: number; compact?: boolean }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'cart' | 'wish' | ''>('');

  async function call(kind: 'cart' | 'wish') {
    setBusy(kind); setMessage('');
    try {
      const response = kind === 'cart'
        ? await fetch('/api/backend/cart/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookId, quantity: 1 }) })
        : await fetch(`/api/backend/wishlist/${bookId}`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) setMessage('Login required');
      else if (!response.ok) setMessage(payload?.error?.message ?? 'Could not complete this action');
      else {
        setMessage(kind === 'cart' ? 'Added to cart' : 'Saved');
        if (kind === 'cart') window.dispatchEvent(new Event('bookhaven:cart-changed'));
      }
    } catch {
      setMessage('Connection problem. Try again.');
    } finally {
      setBusy('');
    }
  }

  return <div className={compact ? '' : 'space-y-3'}>
    <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <button disabled={busy !== '' || stock < 1} onClick={() => call('cart')} className={`button button--primary ${compact ? '!min-h-10 !px-3' : ''}`} aria-label={stock ? 'Add to cart' : 'Out of stock'}>
        {message === 'Added to cart' ? <CheckIcon size={17}/> : <CartIcon size={17}/>}<span>{busy === 'cart' ? 'Adding…' : stock ? (compact ? 'Add' : 'Add to cart') : 'Sold out'}</span>
      </button>
      <button disabled={busy !== ''} onClick={() => call('wish')} className={`button button--ghost ${compact ? '!min-h-10 !px-3' : ''}`} aria-label="Save to wishlist"><HeartIcon size={17}/>{!compact ? <span>{busy === 'wish' ? 'Saving…' : 'Save'}</span> : null}</button>
    </div>
    {message && !compact ? <p className={`mt-2 text-xs ${message === 'Added to cart' || message === 'Saved' ? 'text-emerald-300' : 'text-slate-400'}`}>{message} {message === 'Login required' ? <Link className="text-amber-200 underline underline-offset-4" href="/login">Sign in</Link> : null}</p> : null}
  </div>;
}
