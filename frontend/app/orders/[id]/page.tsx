'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Order } from '@/lib/types';
import { CheckIcon, ChevronLeftIcon, PackageIcon } from '@/app/components/Icons';

const steps: Order['status'][] = ['pending', 'confirmed', 'shipped', 'completed'];
const statusTone: Record<Order['status'], string> = {
  pending: 'text-amber-200',
  confirmed: 'text-sky-300',
  shipped: 'text-violet-300',
  completed: 'text-emerald-300',
  cancelled: 'text-rose-300'
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState('Loading order details…');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`/api/backend/orders/${encodeURIComponent(params.id)}`, { cache: 'no-store' });
        if (response.status === 401) {
          setMessage('Sign in to view this order.');
          return;
        }
        if (response.status === 404) {
          setMessage('This order could not be found.');
          return;
        }
        if (!response.ok) {
          setMessage('Could not load this order.');
          return;
        }
        const payload = await response.json();
        setOrder(payload.data ?? null);
        setMessage('');
      } catch {
        setMessage('Could not reach BookHaven.');
      }
    })();
  }, [params.id]);

  if (!order) {
    return <main className="page-shell pb-28 pt-12 md:pb-20 md:pt-16"><Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-amber-100"><ChevronLeftIcon size={17}/> Back to orders</Link><div className="notice mt-8" aria-live="polite">{message} {message.startsWith('Sign') ? <Link href="/login" className="ml-2 font-bold text-amber-200 underline">Sign in</Link> : null}</div></main>;
  }

  const current = steps.indexOf(order.status);
  return <main className="page-shell pb-28 pt-12 md:pb-20 md:pt-16">
    <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-amber-100"><ChevronLeftIcon size={17}/> Back to orders</Link>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Order detail</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Order …{order._id.slice(-8).toUpperCase()}</h1><p className="mt-3 text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleString()}</p></div><span className={`chip capitalize ${statusTone[order.status]}`}>{order.status === 'completed' ? <CheckIcon size={13}/> : <PackageIcon size={13}/>} {order.status}</span></div>
    <section className="surface mt-8 overflow-hidden rounded-[1.6rem]">
      {order.status !== 'cancelled' ? <div className="border-b border-white/10 p-5 md:p-6"><div className="grid grid-cols-4 gap-2">{steps.map((step, index) => <div key={step}><div className="progress-track"><div className="progress-fill" style={{ width: index <= current ? '100%' : '0%' }}/></div><p className={`mt-2 text-[10px] font-bold capitalize ${index <= current ? 'text-slate-300' : 'text-slate-700'}`}>{step}</p></div>)}</div></div> : <div className="border-b border-white/10 px-5 py-4 text-sm text-rose-300">This order was cancelled. Reserved inventory was restored exactly once.</div>}
      <div className="grid gap-8 p-5 md:grid-cols-[1fr_320px] md:p-7">
        <div><p className="section-kicker">Items</p><div className="mt-4 space-y-3">{order.items.map(item => <div key={`${order._id}-${item.book}`} className="glass flex items-center justify-between gap-4 rounded-xl p-4"><div><strong className="block">{item.title}</strong><span className="mt-1 block text-xs text-slate-500">Quantity {item.quantity} · ${item.unitPrice.toFixed(2)} each</span></div><strong>${(item.quantity * item.unitPrice).toFixed(2)}</strong></div>)}</div></div>
        <aside className="glass h-fit rounded-2xl p-5"><p className="section-kicker">Delivery</p><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">{order.shippingAddress}</p><div className="mt-5 border-t border-white/10 pt-5"><p className="text-xs capitalize text-slate-500">{order.paymentMethod.replaceAll('_', ' ')}</p><div className="mt-2 flex items-end justify-between gap-4"><span className="text-sm text-slate-500">Order total</span><strong className="text-3xl">${order.subtotal.toFixed(2)}</strong></div></div></aside>
      </div>
    </section>
  </main>;
}
