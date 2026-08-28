'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckIcon, PackageIcon } from '@/app/components/Icons';
import type { Order } from '@/lib/types';

const steps: Order['status'][] = ['pending', 'confirmed', 'shipped', 'completed'];

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
          setMessage('Order not found.');
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
        setMessage('Could not reach the BookHaven API.');
      }
    })();
  }, [params.id]);

  if (message) {
    return (
      <main className="page-shell pb-28 pt-12 md:pb-20 md:pt-16">
        <div className="notice" role="status">
          {message}{' '}
          {message.startsWith('Sign') ? <Link href="/login" className="font-bold text-amber-200 underline">Sign in</Link> : null}
        </div>
        <Link href="/orders" className="button button--ghost mt-5">Back to orders</Link>
      </main>
    );
  }

  if (!order) return null;
  const current = steps.indexOf(order.status);

  return (
    <main className="page-shell pb-28 pt-12 md:pb-20 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Order detail</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Order …{order._id.slice(-8).toUpperCase()}</h1>
          <p className="mt-3 text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Link href="/orders" className="button button--ghost">Back to order journal</Link>
      </div>

      <article className="surface mt-9 overflow-hidden rounded-[1.6rem]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 md:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-600">Status</p>
            <p className="mt-1 text-xl font-black capitalize">{order.status}</p>
          </div>
          <span className="chip capitalize">
            {order.status === 'completed' ? <CheckIcon size={13} /> : <PackageIcon size={13} />} {order.status}
          </span>
        </header>

        {order.status !== 'cancelled' ? (
          <section className="p-5 md:p-6" aria-label="Order progress">
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step, index) => (
                <div key={step}>
                  <div className="progress-track"><div className="progress-fill" style={{ width: index <= current ? '100%' : '0%' }} /></div>
                  <p className={`mt-2 text-[10px] font-bold capitalize ${index <= current ? 'text-slate-300' : 'text-slate-700'}`}>{step}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="px-5 py-4 text-sm text-rose-300">This order was cancelled and its inventory was restored.</div>
        )}

        <div className="grid gap-6 border-t border-white/10 p-5 md:grid-cols-[1fr_300px] md:p-6">
          <section>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">Items</p>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={`${order._id}-${item.book}`} className="flex justify-between gap-4 border-b border-white/5 pb-3 text-sm last:border-0">
                  <span className="text-slate-300">{item.quantity} × {item.title}</span>
                  <strong>${(item.quantity * item.unitPrice).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </section>
          <aside className="md:border-l md:border-white/10 md:pl-6">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">Delivery</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{order.shippingAddress}</p>
            <p className="mt-3 text-xs capitalize text-slate-600">{order.paymentMethod.replaceAll('_', ' ')}</p>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[.14em] text-slate-600">Order total</p>
            <p className="mt-1 text-3xl font-black">${order.subtotal.toFixed(2)}</p>
          </aside>
        </div>
      </article>
    </main>
  );
}
