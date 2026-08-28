'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { Book, Order } from '@/lib/types';
import { BookIcon, CheckIcon, PackageIcon, PlusIcon, SearchIcon, ShieldIcon, TrashIcon, UserIcon } from '@/app/components/Icons';

type Stats = {
  books: number;
  users: number;
  orders: number;
  reviews: number;
  lowStock: number;
  revenue: number;
  recentOrders: Order[];
};

type Pagination = { page: number; limit: number; total: number; pages: number };

const transitions: Record<Order['status'], Order['status'][]> = {
  pending: ['pending', 'confirmed', 'cancelled'],
  confirmed: ['confirmed', 'shipped', 'cancelled'],
  shipped: ['shipped', 'completed'],
  completed: ['completed'],
  cancelled: ['cancelled']
};
const orderStatuses: Array<'all' | Order['status']> = ['all', 'pending', 'confirmed', 'shipped', 'completed', 'cancelled'];

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [bookSearchDraft, setBookSearchDraft] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [bookPage, setBookPage] = useState(1);
  const [bookMeta, setBookMeta] = useState<Pagination>({ page: 1, limit: 24, total: 0, pages: 1 });

  const [orderStatus, setOrderStatus] = useState<'all' | Order['status']>('all');
  const [orderSearchDraft, setOrderSearchDraft] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderMeta, setOrderMeta] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const response = await fetch('/api/backend/admin/stats', { cache: 'no-store' });
      if (response.status === 401 || response.status === 403) {
        setStats(null);
        setMessage('Admin sign-in required.');
        return;
      }
      if (!response.ok) {
        setMessage('Could not load dashboard statistics.');
        return;
      }
      setStats((await response.json()).data);
    } catch {
      setMessage('Could not reach the BookHaven API.');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const params = new URLSearchParams({ page: String(bookPage), limit: '24', sort: 'title' });
      if (bookSearch) params.set('search', bookSearch);
      const response = await fetch(`/api/backend/books?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        setMessage('Could not load catalog inventory.');
        return;
      }
      const payload = await response.json();
      setBooks(payload.data ?? []);
      setBookMeta(payload.meta ?? { page: bookPage, limit: 24, total: (payload.data ?? []).length, pages: 1 });
    } catch {
      setMessage('Could not reach catalog inventory.');
    } finally {
      setBooksLoading(false);
    }
  }, [bookPage, bookSearch]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(orderPage), limit: '20' });
      if (orderStatus !== 'all') params.set('status', orderStatus);
      if (orderSearch) params.set('search', orderSearch);
      const response = await fetch(`/api/backend/orders/admin/all?${params.toString()}`, { cache: 'no-store' });
      if (response.status === 401 || response.status === 403) {
        setOrders([]);
        setMessage('Admin sign-in required.');
        return;
      }
      if (!response.ok) {
        setMessage('Could not load the order queue.');
        return;
      }
      const payload = await response.json();
      setOrders(payload.data ?? []);
      setOrderMeta(payload.meta ?? { page: orderPage, limit: 20, total: (payload.data ?? []).length, pages: 1 });
    } catch {
      setMessage('Could not reach the BookHaven API.');
    } finally {
      setOrdersLoading(false);
    }
  }, [orderPage, orderSearch, orderStatus]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { void loadBooks(); }, [loadBooks]);
  useEffect(() => { void loadOrders(); }, [loadOrders]);

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
      categories: String(form.get('categories') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
      featured: form.get('featured') === 'on'
    };
    const editing = editingBook;
    try {
      const response = await fetch(editing ? `/api/backend/books/${editing._id}` : '/api/backend/books', {
        method: editing ? 'PATCH' : 'POST',
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
      await Promise.all([loadBooks(), loadOverview()]);
    } catch {
      setMessage('Could not save the book.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteBook(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    try {
      const response = await fetch(`/api/backend/books/${id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? 'Could not delete book.');
        return;
      }
      setMessage('Book and dependent reader data removed.');
      setConfirmDelete('');
      if (editingBook?._id === id) setEditingBook(null);
      await Promise.all([loadBooks(), loadOverview()]);
    } catch {
      setMessage('Could not delete book.');
    }
  }

  async function updateOrder(id: string, status: Order['status']) {
    try {
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
      await Promise.all([loadOrders(), loadOverview()]);
    } catch {
      setMessage('Could not update order status.');
    }
  }

  function submitBookSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookSearch(bookSearchDraft.trim());
    setBookPage(1);
  }
  function clearBookSearch() {
    setBookSearchDraft('');
    setBookSearch('');
    setBookPage(1);
  }
  function submitOrderSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderSearch(orderSearchDraft.trim());
    setOrderPage(1);
  }
  function clearOrderSearch() {
    setOrderSearchDraft('');
    setOrderSearch('');
    setOrderPage(1);
  }

  const metrics = stats ? [
    ['Books', stats.books, <BookIcon key="b" size={18} />],
    ['Readers', stats.users, <UserIcon key="u" size={18} />],
    ['Orders', stats.orders, <PackageIcon key="o" size={18} />],
    ['Reviews', stats.reviews, <CheckIcon key="r" size={18} />],
    ['Low stock', stats.lowStock, <ShieldIcon key="l" size={18} />],
    ['Order value', `$${stats.revenue.toFixed(2)}`, <span key="v">$</span>]
  ] : [];
  const firstOrder = orderMeta.total === 0 ? 0 : (orderMeta.page - 1) * orderMeta.limit + 1;
  const lastOrder = Math.min(orderMeta.page * orderMeta.limit, orderMeta.total);

  return (
    <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="section-kicker">Command center</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Run the bookstore at a glance.</h1><p className="mt-3 text-sm text-slate-500">Catalog, readers and fulfillment—without jumping between dashboards.</p></div>
        <span className="chip"><ShieldIcon size={14} /> Admin only</span>
      </div>
      {message ? <div aria-live="polite" className={`notice mt-6 ${message.includes('required') || message.includes('Could') || message.includes('cannot') ? 'notice--error' : 'notice--success'}`}>{message}</div> : null}
      {overviewLoading ? <div className="surface mt-8 h-24 animate-pulse rounded-2xl" aria-label="Loading admin dashboard" /> : null}
      {stats ? <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{metrics.map(([label, value, icon]) => <div key={String(label)} className="metric"><div className="flex items-center justify-between text-slate-600"><span className="metric__label">{label}</span>{icon}</div><p className="metric__value">{value}</p></div>)}</section> : null}

      <div className="mt-10 grid gap-8 xl:grid-cols-[390px_1fr]">
        <section className="surface h-fit rounded-[1.6rem] p-5 xl:sticky xl:top-28">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><PlusIcon size={18} /></span><div><h2 className="font-black">{editingBook ? 'Edit catalog item' : 'Add inventory'}</h2><p className="text-xs text-slate-500">{editingBook ? `Editing ${editingBook.title}` : 'Publish directly to the catalog.'}</p></div></div>
          <form key={editingBook?._id ?? 'new'} onSubmit={submit} className="mt-5 grid gap-3">
            <input name="title" required defaultValue={editingBook?.title} placeholder="Title" aria-label="Book title" className="admin-input" />
            <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={editingBook?.slug} placeholder="slug-like-this" aria-label="Book slug" className="admin-input" />
            <input name="author" required defaultValue={editingBook?.author} placeholder="Author" aria-label="Book author" className="admin-input" />
            <div className="grid grid-cols-2 gap-3"><input name="price" required type="number" min="0" step="0.01" defaultValue={editingBook?.price} placeholder="Price" aria-label="Book price" className="admin-input" /><input name="stock" required type="number" min="0" step="1" defaultValue={editingBook?.stock} placeholder="Stock" aria-label="Book stock" className="admin-input" /></div>
            <input name="coverUrl" type="url" pattern="https://.*" defaultValue={editingBook?.coverUrl} placeholder="HTTPS cover URL" aria-label="Book cover URL" className="admin-input" />
            <input name="isbn" defaultValue={editingBook?.isbn} placeholder="ISBN (optional)" aria-label="Book ISBN" className="admin-input" />
            <input name="categories" defaultValue={editingBook?.categories.join(', ')} placeholder="Categories, comma separated" aria-label="Book categories" className="admin-input" />
            <textarea name="description" rows={5} maxLength={5000} defaultValue={editingBook?.description} placeholder="Description" aria-label="Book description" className="admin-input" />
            <label className="flex items-center gap-2 text-sm text-slate-400"><input name="featured" type="checkbox" defaultChecked={editingBook?.featured} /> Feature this title</label>
            <button disabled={busy} className="button button--violet w-full">{busy ? 'Saving…' : editingBook ? 'Save catalog changes' : <>Publish book <PlusIcon size={16} /></>}</button>
            {editingBook ? <button type="button" onClick={() => setEditingBook(null)} className="button button--ghost w-full">Cancel editing</button> : null}
          </form>
        </section>

        <section className="space-y-9">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="section-kicker">Inventory</p><h2 className="mt-1 text-2xl font-black">Catalog health</h2><p className="mt-1 text-xs text-slate-600">{bookMeta.total} matching titles</p></div>
              <form onSubmit={submitBookSearch} className="flex w-full max-w-md gap-2"><label className="relative flex-1"><span className="sr-only">Search catalog</span><SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" /><input value={bookSearchDraft} onChange={(event) => setBookSearchDraft(event.target.value)} maxLength={200} placeholder="Search title, author or description" className="field !min-h-11 pl-9" /></label><button type="submit" className="button button--ghost !min-h-11">Search</button></form>
            </div>
            {bookSearch ? <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500"><span>Searching for “{bookSearch}”</span><button type="button" onClick={clearBookSearch} className="font-bold text-violet-300 hover:text-violet-200">Clear search</button></div> : null}
            {booksLoading ? <div className="surface mt-4 h-28 animate-pulse rounded-2xl" aria-label="Loading catalog inventory" /> : <div className="mt-4 grid gap-3 md:grid-cols-2">{books.map((book) => <article key={book._id} className={`glass rounded-2xl p-4 ${editingBook?._id === book._id ? 'ring-1 ring-violet-400/60' : ''}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate font-black">{book.title}</p><p className="mt-1 truncate text-xs text-slate-500">{book.author}</p></div><span className={`chip shrink-0 ${book.stock <= 5 ? '!text-amber-200' : '!text-emerald-300'}`}>{book.stock} stock</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><strong>${book.price.toFixed(2)}</strong><div className="flex gap-2"><button type="button" onClick={() => { setEditingBook(book); setConfirmDelete(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="button button--ghost !min-h-9 !px-3">Edit</button><button type="button" onClick={() => void deleteBook(book._id)} className={`button !min-h-9 !px-2.5 ${confirmDelete === book._id ? 'button--danger' : 'button--ghost'}`} aria-label={confirmDelete === book._id ? `Confirm delete ${book.title}` : `Delete ${book.title}`}><TrashIcon size={15} />{confirmDelete === book._id ? <span>Confirm</span> : null}</button></div></div></article>)}</div>}
            {!booksLoading && books.length === 0 ? <p className="mt-4 text-sm text-slate-500">No catalog titles match the current search.</p> : null}
            {bookMeta.pages > 1 ? <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Admin catalog pages"><button type="button" disabled={bookPage <= 1 || booksLoading} onClick={() => setBookPage((current) => Math.max(1, current - 1))} className="button button--ghost disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="text-xs font-bold text-slate-500">Page {bookMeta.page} of {bookMeta.pages}</span><button type="button" disabled={bookPage >= bookMeta.pages || booksLoading} onClick={() => setBookPage((current) => Math.min(bookMeta.pages, current + 1))} className="button button--ghost disabled:cursor-not-allowed disabled:opacity-40">Next</button></nav> : null}
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Fulfillment</p><h2 className="mt-1 text-2xl font-black">Order queue</h2></div><span className="text-xs text-slate-600">{ordersLoading ? 'Refreshing…' : orderMeta.total > 0 ? `${firstOrder}–${lastOrder} of ${orderMeta.total}` : '0 orders'}</span></div>
            <div className="glass mt-4 rounded-[1.4rem] p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]"><form onSubmit={submitOrderSearch} className="flex gap-2 lg:contents"><input value={orderSearchDraft} onChange={(event) => setOrderSearchDraft(event.target.value)} maxLength={120} placeholder="Search order ID, reader, email, address or book" aria-label="Search orders" className="admin-input min-w-0 flex-1" /><select value={orderStatus} onChange={(event) => { setOrderStatus(event.target.value as 'all' | Order['status']); setOrderPage(1); }} aria-label="Filter orders by status" className="field !min-h-11 capitalize">{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="submit" className="button button--ghost !min-h-11">Search</button></form></div>
              {orderSearch ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Searching for “{orderSearch}”</span><button type="button" onClick={clearOrderSearch} className="font-bold text-violet-300 hover:text-violet-200">Clear search</button></div> : null}
            </div>
            <div className={`glass mt-3 overflow-hidden rounded-[1.4rem] ${ordersLoading ? 'opacity-70' : ''}`} aria-busy={ordersLoading}>
              <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-white/10 text-[10px] uppercase tracking-[.13em] text-slate-600"><tr><th className="p-4">Order</th><th className="p-4">Reader</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Next state</th></tr></thead><tbody>{orders.map((order) => <tr key={order._id} className="border-b border-white/5 last:border-0"><td className="p-4 font-mono text-xs text-slate-400">…{order._id.slice(-8)}</td><td className="p-4"><strong className="block">{order.user?.name ?? 'Customer'}</strong><span className="text-xs text-slate-600">{order.user?.email}</span></td><td className="p-4 text-slate-400">{order.items.reduce((count, item) => count + item.quantity, 0)}</td><td className="p-4 font-black">${order.subtotal.toFixed(2)}</td><td className="p-4"><span className="chip capitalize">{order.status}</span></td><td className="p-4"><select value={order.status} onChange={(event) => void updateOrder(order._id, event.target.value as Order['status'])} className="field !min-h-10 !py-1.5">{transitions[order.status].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>
              {!ordersLoading && orders.length === 0 ? <p className="p-6 text-sm text-slate-500">No orders match the current filters.</p> : null}
            </div>
            {orderMeta.pages > 1 ? <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Admin order pages"><button type="button" disabled={orderPage <= 1 || ordersLoading} onClick={() => setOrderPage((current) => Math.max(1, current - 1))} className="button button--ghost disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="text-xs font-bold text-slate-500">Page {orderMeta.page} of {orderMeta.pages}</span><button type="button" disabled={orderPage >= orderMeta.pages || ordersLoading} onClick={() => setOrderPage((current) => Math.min(orderMeta.pages, current + 1))} className="button button--ghost disabled:cursor-not-allowed disabled:opacity-40">Next</button></nav> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
