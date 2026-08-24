'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { Book, Order } from '@/lib/types';
import { BookIcon, CheckIcon, PackageIcon, PlusIcon, ShieldIcon, TrashIcon, UserIcon } from '@/app/components/Icons';

type Stats = {
  books: number;
  users: number;
  orders: number;
  reviews: number;
  lowStock: number;
  revenue: number;
  recentOrders: Order[];
};

const transitions: Record<Order['status'], Order['status'][]> = {
  pending: ['pending', 'confirmed', 'cancelled'],
  confirmed: ['confirmed', 'shipped', 'cancelled'],
  shipped: ['shipped', 'completed'],
  completed: ['completed'],
  cancelled: ['cancelled']
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, booksRes] = await Promise.all([
        fetch('/api/backend/admin/stats', { cache: 'no-store' }),
        fetch('/api/backend/orders/admin/all', { cache: 'no-store' }),
        fetch('/api/backend/books?limit=100&sort=title', { cache: 'no-store' })
      ]);

      if (statsRes.status === 401 || statsRes.status === 403) {
        setMessage('Admin sign-in required.');
        return;
      }

      if (!statsRes.ok || !ordersRes.ok || !booksRes.ok) {
        setMessage('Could not load the complete admin dashboard.');
        return;
      }

      setStats((await statsRes.json()).data);
      setOrders((await ordersRes.json()).data ?? []);
      setBooks((await booksRes.json()).data ?? []);
    } catch {
      setMessage('Could not reach the BookHaven API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get('title') ?? '').trim(),
      slug: String(form.get('slug') ?? '').trim(),
      author: String(form.get('author') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      coverUrl: String(form.get('coverUrl') ?? '').trim() || undefined,
      isbn: String(form.get('isbn') ?? '').trim() || undefined,
      price: Number(form.get('price')),
      stock: Number(form.get('stock')),
      categories: String(form.get('categories') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      featured: form.get('featured') === 'on'
    };

    const editing = editingBook;
    const endpoint = editing ? `/api/backend/books/${editing._id}` : '/api/backend/books';
    const method = editing ? 'PATCH' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error?.message ?? `Could not ${editing ? 'update' : 'create'} book.`);
        return;
      }

      setMessage(editing ? 'Book changes published to the live catalog.' : 'Book created and added to the live catalog.');
      setEditingBook(null);
      event.currentTarget.reset();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteBook(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }

    const response = await fetch(`/api/backend/books/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Could not delete book.');
      return;
    }

    setMessage('Book and dependent reader data removed.');
    setConfirmDelete('');
    if (editingBook?._id === id) setEditingBook(null);
    await load();
  }

  async function updateOrder(id: string, status: Order['status']) {
    const response = await fetch(`/api/backend/orders/admin/${id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Could not update order status.');
      return;
    }

    setMessage(`Order moved to ${status}.`);
    await load();
  }

  const metrics = stats
    ? [
        ['Books', stats.books, <BookIcon key="b" size={18} />],
        ['Readers', stats.users, <UserIcon key="u" size={18} />],
        ['Orders', stats.orders, <PackageIcon key="o" size={18} />],
        ['Reviews', stats.reviews, <CheckIcon key="r" size={18} />],
        ['Low stock', stats.lowStock, <ShieldIcon key="l" size={18} />],
        ['Order value', `$${stats.revenue.toFixed(2)}`, <span key="v">$</span>]
      ]
    : [];

  return (
    <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Command center</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Run the bookstore at a glance.</h1>
          <p className="mt-3 text-sm text-slate-500">Catalog, readers and fulfillment—without jumping between dashboards.</p>
        </div>
        <span className="chip"><ShieldIcon size={14} /> Admin only</span>
      </div>

      {message ? (
        <div aria-live="polite" className={`notice mt-6 ${message.includes('required') || message.includes('Could') ? 'notice--error' : 'notice--success'}`}>
          {message}
        </div>
      ) : null}

      {loading ? <div className="surface mt-8 h-24 animate-pulse rounded-2xl" aria-label="Loading admin dashboard" /> : null}

      {stats ? (
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {metrics.map(([label, value, icon]) => (
            <div key={String(label)} className="metric">
              <div className="flex items-center justify-between text-slate-600">
                <span className="metric__label">{label}</span>{icon}
              </div>
              <p className="metric__value">{value}</p>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mt-10 grid gap-8 xl:grid-cols-[390px_1fr]">
        <section className="surface h-fit rounded-[1.6rem] p-5 xl:sticky xl:top-28">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><PlusIcon size={18} /></span>
            <div>
              <h2 className="font-black">{editingBook ? 'Edit catalog item' : 'Add inventory'}</h2>
              <p className="text-xs text-slate-500">{editingBook ? `Editing ${editingBook.title}` : 'Publish directly to the catalog.'}</p>
            </div>
          </div>

          <form key={editingBook?._id ?? 'new'} onSubmit={submit} className="mt-5 grid gap-3">
            <input name="title" required defaultValue={editingBook?.title} placeholder="Title" className="admin-input" />
            <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={editingBook?.slug} placeholder="slug-like-this" className="admin-input" />
            <input name="author" required defaultValue={editingBook?.author} placeholder="Author" className="admin-input" />
            <div className="grid grid-cols-2 gap-3">
              <input name="price" required type="number" min="0" step="0.01" defaultValue={editingBook?.price} placeholder="Price" className="admin-input" />
              <input name="stock" required type="number" min="0" step="1" defaultValue={editingBook?.stock} placeholder="Stock" className="admin-input" />
            </div>
            <input name="coverUrl" type="url" pattern="https://.*" defaultValue={editingBook?.coverUrl} placeholder="HTTPS cover URL" className="admin-input" />
            <input name="isbn" defaultValue={editingBook?.isbn} placeholder="ISBN (optional)" className="admin-input" />
            <input name="categories" defaultValue={editingBook?.categories.join(', ')} placeholder="Categories, comma separated" className="admin-input" />
            <textarea name="description" rows={5} maxLength={5000} defaultValue={editingBook?.description} placeholder="Description" className="admin-input" />
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input name="featured" type="checkbox" defaultChecked={editingBook?.featured} /> Feature this title
            </label>
            <button disabled={busy} className="button button--violet w-full">
              {busy ? 'Saving…' : editingBook ? 'Save catalog changes' : <>Publish book <PlusIcon size={16} /></>}
            </button>
            {editingBook ? (
              <button type="button" onClick={() => setEditingBook(null)} className="button button--ghost w-full">Cancel editing</button>
            ) : null}
          </form>
        </section>

        <section className="space-y-9">
          <div>
            <div className="flex items-center justify-between">
              <div><p className="section-kicker">Inventory</p><h2 className="mt-1 text-2xl font-black">Catalog health</h2></div>
              <span className="text-xs text-slate-600">{books.length} loaded</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {books.map((book) => (
                <article key={book._id} className={`glass rounded-2xl p-4 ${editingBook?._id === book._id ? 'ring-1 ring-violet-400/60' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><p className="truncate font-black">{book.title}</p><p className="mt-1 truncate text-xs text-slate-500">{book.author}</p></div>
                    <span className={`chip shrink-0 ${book.stock <= 5 ? '!text-amber-200' : '!text-emerald-300'}`}>{book.stock} stock</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <strong>${book.price.toFixed(2)}</strong>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingBook(book); setConfirmDelete(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="button button--ghost !min-h-9 !px-3">Edit</button>
                      <button type="button" onClick={() => void deleteBook(book._id)} className={`button !min-h-9 !px-2.5 ${confirmDelete === book._id ? 'button--danger' : 'button--ghost'}`} aria-label={confirmDelete === book._id ? `Confirm delete ${book.title}` : `Delete ${book.title}`}>
                        <TrashIcon size={15} />{confirmDelete === book._id ? <span>Confirm</span> : null}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!loading && books.length === 0 ? <p className="text-sm text-slate-500">No books in the catalog yet.</p> : null}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div><p className="section-kicker">Fulfillment</p><h2 className="mt-1 text-2xl font-black">Order queue</h2></div>
              <span className="text-xs text-slate-600">{orders.length} orders</span>
            </div>
            <div className="glass mt-4 overflow-hidden rounded-[1.4rem]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-[.13em] text-slate-600"><tr><th className="p-4">Order</th><th className="p-4">Reader</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Next state</th></tr></thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-white/5 last:border-0">
                        <td className="p-4 font-mono text-xs text-slate-400">…{order._id.slice(-8)}</td>
                        <td className="p-4"><strong className="block">{order.user?.name ?? 'Customer'}</strong><span className="text-xs text-slate-600">{order.user?.email}</span></td>
                        <td className="p-4 text-slate-400">{order.items.reduce((count, item) => count + item.quantity, 0)}</td>
                        <td className="p-4 font-black">${order.subtotal.toFixed(2)}</td>
                        <td className="p-4"><select value={order.status} onChange={(event) => void updateOrder(order._id, event.target.value as Order['status'])} className="field !min-h-10 !py-1.5">{transitions[order.status].map((status) => <option key={status}>{status}</option>)}</select></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {orders.length === 0 ? <p className="p-6 text-sm text-slate-500">No orders yet.</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
