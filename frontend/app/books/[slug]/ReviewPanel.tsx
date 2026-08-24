'use client';

import { FormEvent, useState } from 'react';
import type { Review } from '@/lib/types';
import { StarIcon } from '@/app/components/Icons';

export default function ReviewPanel({ bookId, initialReviews, initialAverage, initialCount }: { bookId: string; initialReviews: Review[]; initialAverage: number; initialCount: number }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/backend/reviews/book/${bookId}`, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    setReviews(payload.data ?? []); setAverage(payload.meta?.averageRating ?? 0); setCount(payload.meta?.count ?? 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/backend/reviews/book/${bookId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rating, comment: String(form.get('comment') ?? '') }) });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) setMessage('Sign in to publish your reading note.');
      else if (!response.ok) setMessage(payload?.error?.message ?? 'Could not save review.');
      else { setMessage('Your review is live.'); event.currentTarget.reset(); await refresh(); }
    } catch { setMessage('Connection problem. Try again.'); }
    finally { setBusy(false); }
  }

  return <section className="mt-16 border-t border-white/10 pt-12 md:mt-20">
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <div><p className="section-kicker">Reader room</p><h2 className="mt-2 text-3xl font-black tracking-tight">What readers felt.</h2><p className="mt-3 text-sm leading-6 text-slate-500">Ratings are attached to real accounts, so the conversation stays useful.</p><div className="glass mt-6 rounded-2xl p-5"><p className="text-5xl font-black tracking-tight">{count ? average.toFixed(1) : '—'}</p><div className="mt-2 flex gap-1 text-amber-200">{[1,2,3,4,5].map(n => <StarIcon key={n} size={16} fill={n <= Math.round(average) ? 'currentColor' : 'none'} />)}</div><p className="mt-2 text-sm text-slate-500">{count} published review{count === 1 ? '' : 's'}</p></div></div>
      <div>
        <form onSubmit={submit} className="glass rounded-[1.4rem] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><strong className="text-lg">Leave a reading note</strong><p className="mt-1 text-xs text-slate-500">You can update your review later.</p></div><div className="flex gap-1" aria-label={`${rating} stars`}>{[1,2,3,4,5].map(n => <button type="button" key={n} onClick={() => setRating(n)} className={`rounded-lg p-1.5 transition ${n <= rating ? 'text-amber-200' : 'text-slate-700 hover:text-slate-400'}`} aria-label={`Rate ${n} stars`}><StarIcon size={20} fill={n <= rating ? 'currentColor' : 'none'} /></button>)}</div></div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input name="comment" maxLength={2000} placeholder="What stayed with you?" className="field flex-1" /><button disabled={busy} className="button button--violet sm:min-w-32">{busy ? 'Saving…' : 'Publish'}</button></div>
          {message ? <p aria-live="polite" className={`mt-3 text-sm ${message.includes('live') ? 'text-emerald-300' : 'text-slate-400'}`}>{message}</p> : null}
        </form>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{reviews.length ? reviews.map(review => <article key={review._id} className="glass rounded-2xl p-5"><div className="flex items-center justify-between gap-3"><div><strong className="block text-sm">{review.user?.name ?? 'Reader'}</strong><span className="text-[11px] text-slate-600">{new Date(review.createdAt).toLocaleDateString()}</span></div><span className="text-xs font-bold text-amber-200">{review.rating}.0 ★</span></div><p className="mt-4 text-sm leading-6 text-slate-300">{review.comment || 'Rated without a written comment.'}</p></article>) : <div className="empty-state sm:col-span-2 !min-h-48"><div className="empty-state__icon"><StarIcon size={26}/></div><h2>No reviews yet</h2><p>Be the first reader to leave a thoughtful note.</p></div>}</div>
      </div>
    </div>
  </section>;
}
