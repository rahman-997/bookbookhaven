'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import EmptyState from '@/app/components/EmptyState';
import { ArrowRightIcon, CheckIcon, PackageIcon } from '@/app/components/Icons';
import type { Order } from '@/lib/types';

const steps: Order['status'][] = ['pending', 'confirmed', 'shipped', 'completed'];
const statuses: Array<'all' | Order['status']> = ['all', 'pending', 'confirmed', 'shipped', 'completed', 'cancelled'];
const statusTone: Record<Order['status'], string> = { pending: 'text-amber-200', confirmed: 'text-sky-300', shipped: 'text-violet-300', completed: 'text-emerald-300', cancelled: 'text-rose-300' };
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<'all' | Order['status']>('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Pagination>({ page: 1, limit: 8, total: 0, pages: 1 });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '8' });
      if (status !== 'all') params.set('status', status);
      const response = await fetch(`/api/backend/orders?${params.toString()}`, { cache: 'no-store' });
      if (response.status === 401) { setOrders([]); setMessage('Sign in to view your orders.'); return; }
      if (!response.ok) { setMessage('Could not load orders.'); return; }
      const payload = await response.json();
      setOrders(payload.data ?? []);
      setMeta(payload.meta ?? { page, limit: 8, total: (payload.data ?? []).length, pages: 1 });
    } catch { setMessage('Could not reach the BookHaven API.'); }
    finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const lastItem = Math.min(meta.page * meta.limit, meta.total);

  return <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Order journal</p><h1 className="mt-2 max-w-4xl text-4xl font-black tracking-[-.045em] md:text-6xl">Every book has a journey after checkout.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Follow purchases from pending to complete, revisit the exact order snapshot and keep delivery details in one place.</p></div><Link href="/#library" className="button button--ghost">Find another book <ArrowRightIcon size={15}/></Link></div>

    <section className="surface mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] p-4"><div className="flex flex-wrap items-center gap-3"><label htmlFor="order-status" className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">Filter status</label><select id="order-status" value={status} onChange={(event) => { setStatus(event.target.value as 'all' | Order['status']); setPage(1); }} className="field !min-h-10 !py-1.5 capitalize">{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-600">Journal entries</p><p className="mt-1 text-sm font-bold text-slate-400">{loading ? 'Refreshing…' : meta.total > 0 ? `${firstItem}–${lastItem} of ${meta.total}` : 'No matching orders'}</p></div></section>

    {message ? <div className="notice mt-6" role="status">{message} {message.startsWith('Sign') ? <Link href="/login" className="font-bold text-amber-200 underline">Sign in</Link> : null}</div> : null}
    {loading && orders.length === 0 ? <div className="surface mt-8 h-32 animate-pulse rounded-2xl" aria-label="Loading orders" /> : null}

    <div className={`mt-9 space-y-5 ${loading ? 'opacity-70' : ''}`} aria-busy={loading}>{orders.map((order) => {
      const current = steps.indexOf(order.status);
      return <article key={order._id} className="surface overflow-hidden rounded-[1.7rem]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.08] p-5 md:p-6"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] text-amber-200"><PackageIcon size={19}/></div><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-600">Order {order._id.slice(-8).toUpperCase()}</p><p className="mt-1 font-black tracking-tight">{new Date(order.createdAt).toLocaleString()}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`chip capitalize ${statusTone[order.status]}`}>{order.status === 'completed' ? <CheckIcon size={13} /> : <PackageIcon size={13} />} {order.status}</span><Link href={`/orders/${order._id}`} className="button button--ghost !min-h-9 !px-3">Open entry</Link></div></header>
        {order.status !== 'cancelled' ? <div className="p-5 md:p-6"><div className="grid grid-cols-4 gap-2">{steps.map((step, index) => <div key={step}><div className="progress-track"><div className="progress-fill" style={{ width: index <= current ? '100%' : '0%' }} /></div><p className={`mt-2 text-[10px] font-bold capitalize ${index <= current ? 'text-slate-300' : 'text-slate-700'}`}>{step}</p></div>)}</div></div> : <div className="px-5 py-4 text-sm text-rose-300">This order was cancelled and its stock was restored.</div>}
        <div className="grid gap-6 border-t border-white/[.08] p-5 md:grid-cols-[1fr_300px] md:p-6"><div className="space-y-3">{order.items.map((item) => <div key={`${order._id}-${item.book}`} className="flex justify-between gap-4 text-sm"><span className="text-slate-300"><strong className="mr-2 text-slate-500">{item.quantity}×</strong>{item.title}</span><strong>${(item.quantity * item.unitPrice).toFixed(2)}</strong></div>)}</div><div className="editorial-card p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">Delivery snapshot</p><p className="mt-2 text-sm leading-6 text-slate-400">{order.shippingAddress}</p><p className="mt-3 text-xs capitalize text-slate-600">{order.paymentMethod.replaceAll('_', ' ')}</p><p className="mt-5 text-3xl font-black tracking-tight">${order.subtotal.toFixed(2)}</p></div></div>
      </article>;
    })}</div>

    {!message && !loading && orders.length === 0 ? <div className="mt-10"><EmptyState title={status === 'all' ? 'No orders yet' : `No ${status} orders`} description={status === 'all' ? 'When a title becomes yours, its journey will appear here.' : 'Try another status or browse the catalog for your next read.'} icon={<PackageIcon size={27} />} /></div> : null}
    {!message && meta.pages > 1 ? <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Order pages"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="button button--ghost disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="text-xs font-bold text-slate-500">Page {meta.page} of {meta.pages}</span><button type="button" disabled={page >= meta.pages || loading} onClick={() => setPage((current) => Math.min(meta.pages, current + 1))} className="button button--ghost disabled:cursor-not-allowed disabled:opacity-40">Next</button></nav> : null}
  </main>;
}
