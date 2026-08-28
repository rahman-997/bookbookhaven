'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Order } from '@/lib/types';
import EmptyState from '@/app/components/EmptyState';
import { ArrowRightIcon, CheckIcon, PackageIcon } from '@/app/components/Icons';

const statusTone: Record<Order['status'], string> = {
  pending: 'text-amber-200',
  confirmed: 'text-sky-300',
  shipped: 'text-violet-300',
  completed: 'text-emerald-300',
  cancelled: 'text-rose-300'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('Loading your order journal…');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/backend/orders', { cache: 'no-store' });
        if (response.status === 401) {
          setMessage('Sign in to view your orders.');
          return;
        }
        if (!response.ok) {
          setMessage('Could not load orders.');
          return;
        }
        const payload = await response.json();
        setOrders(payload.data ?? []);
        setMessage('');
      } catch {
        setMessage('Could not reach BookHaven.');
      }
    })();
  }, []);

  return <main className="page-shell pb-28 pt-12 md:pb-20 md:pt-16">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Order journal</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">From shelf to doorstep.</h1><p className="mt-3 text-sm text-slate-500">Every purchase and fulfillment state, with a dedicated detail view.</p></div><Link href="/" className="button button--ghost">Find another book</Link></div>
    {message ? <div className="notice mt-8" aria-live="polite">{message} {message.startsWith('Sign') ? <Link href="/login" className="ml-2 font-bold text-amber-200 underline">Sign in</Link> : null}</div> : null}
    <div className="mt-9 grid gap-4 lg:grid-cols-2">{orders.map(order => <article key={order._id} className="surface rounded-[1.5rem] p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-600">Order …{order._id.slice(-8).toUpperCase()}</p><p className="mt-1 text-sm font-bold">{new Date(order.createdAt).toLocaleString()}</p></div><span className={`chip capitalize ${statusTone[order.status]}`}>{order.status === 'completed' ? <CheckIcon size={13}/> : <PackageIcon size={13}/>} {order.status}</span></div><div className="mt-5 border-t border-white/10 pt-5"><div className="flex items-end justify-between gap-4"><div><span className="text-xs text-slate-500">{order.items.reduce((count, item) => count + item.quantity, 0)} items</span><strong className="mt-1 block text-2xl">${order.subtotal.toFixed(2)}</strong></div><Link href={`/orders/${order._id}`} className="button button--ghost !min-h-10">View detail <ArrowRightIcon size={15}/></Link></div></div></article>)}</div>
    {!message && orders.length === 0 ? <div className="mt-10"><EmptyState title="No orders yet" description="When a title becomes yours, its journey will appear here." icon={<PackageIcon size={27}/>} /></div> : null}
  </main>;
}
