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

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [bookSearchDraft, setBookSearchDraft] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [bookPage, setBookPage] = useState(1);
  const [bookMeta, setBookMeta] = useState<Pagination>({ page: 1, limit: 24, total: 0, pages: 1 });

  const [orderSearchDraft, setOrderSearchDraft] = useState('');
  const [orderStatusDraft, setOrderStatusDraft] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderMeta, setOrderMeta] = useState<Pagination>({ page: 1, limit: 25, total: 0, pages: 1 });

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
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
      setLoadingOverview(false);
    }
  }, []);

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true);
    const query = new URLSearchParams({ page: String(bookPage), limit: '24', sort: 'title' });
    if (bookSearch) query.set('search', bookSearch);
    try {
      const response = await fetch(`/api/backend/books?${query}`, { cache: 'no-store' });
      if (!response.ok) {
        setMessage('Could not load catalog inventory.');
        return;
      }
      const payload = await response.json();
      setBooks(payload.data ?? []);
      setBookMeta(payload.meta ?? { page: bookPage, limit: 24, total: 0, pages: 1 });
    } catch {
      setMessage('Could not reach catalog inventory.');
    } finally {
      setLoadingBooks(false);
    }
  }, [bookPage, bookSearch]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const query = new URLSearchParams({ page: String(orderPage), limit: '25' });
    if (orderSearch) query.set('search', orderSearch);
    if (orderStatus) query.set('status', orderStatus);
    try {
      const response = await fetch(`/api/backend/orders/admin/all?${query}`, { cache: 'no-store' });
      if (response.status === 401 || response.status === 403) {
        setOrders([]);
        setMessage('Admin sign-in required.');
        return;
      }
      if (!response.ok) {
        setMessage('Could not load order queue.');
        return;
      }
      const payload = await response.json();
      setOrders(payload.data ?? []);
      setOrderMeta(payload.meta ?? { page: orderPage, limit: 25, total: 0, pages: 1 });
    } catch {
      setMessage('Could not reach the order queue.');
    } finally {
      setLoadingOrders(false);
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
      categories: String(form.get('categories') ?? '').split(',').map(value => value.trim()).filter(Boolean),
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
      setMessage(editing ? 'Book changes published to the catalog.' : 'Book created and added to the catalog.');
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
      if (!response.ok) {
        setMessage('Could not delete book.');
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

  function applyBookSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookPage(1);
    setBookSearch(bookSearchDraft.trim());
  }

  function applyOrderFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderPage(1);
    setOrderSearch(orderSearchDraft.trim());
    setOrderStatus(orderStatusDraft);
  }

  const metrics = stats ? [
    ['Books', stats.books, <BookIcon key="b" size={18} />],
    ['Readers', stats.users, <UserIcon key="u" size={18} />],
    ['Orders', stats.orders, <PackageIcon key="o" size={18} />],
    ['Reviews', stats.reviews, <CheckIcon key="r" size={18} />],
    ['Low stock', stats.lowStock, <ShieldIcon key="l" size={18} />],
    ['Order value', `$${stats.revenue.toFixed(2)}`, <span key="v">$</span>]
  ] : [];

  return <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Command center</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Run the bookstore at a glance.</h1><p className="mt-3 text-sm text-slate-500">Catalog, readers and fulfillment with server-side search and pagination.</p></div><span className="chip"><ShieldIcon size={14}/> Admin only</span></div>
    {message ? <div aria-live="polite" className={`notice mt-6 ${message.includes('required') || message.includes('Could') ? 'notice--error' : 'notice--success'}`}>{message}</div> : null}
    {loadingOverview ? <div className="surface mt-8 h-24 animate-pulse rounded-2xl" aria-label="Loading admin dashboard" /> : null}
    {stats ? <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{metrics.map(([label, value, icon]) => <div key={String(label)} className="metric"><div className="flex items-center justify-between text-slate-600"><span className="metric__label">{label}</span>{icon}</div><p className="metric__value">{value}</p></div>)}</section> : null}

    <div className="mt-10 grid gap-8 xl:grid-cols-[390px_1fr]">
      <section className="surface h-fit rounded-[1.6rem] p-5 xl:sticky xl:top-28">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><PlusIcon size={18}/></span><div><h2 className="font-black">{editingBook ? 'Edit catalog item' : 'Add inventory'}</h2><p className="text-xs text-slate-500">{editingBook ? `Editing ${editingBook.title}` : 'Publish directly to the catalog.'}</p></div></div>
        <form key={editingBook?._id ?? 'new'} onSubmit={submit} className="mt-5 grid gap-3">
          <input name="title" required defaultValue={editingBook?.title} placeholder="Title" className="admin-input" />
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={editingBook?.slug} placeholder="slug-like-this" className="admin-input" />
          <input name="author" required defaultValue={editingBook?.author} placeholder="Author" className="admin-input" />
          <div className="grid grid-cols-2 gap-3"><input name="price" required type="number" min="0" step="0.01" defaultValue={editingBook?.price} placeholder="Price" className="admin-input"/><input name="stock" required type="number" min="0" step="1" defaultValue={editingBook?.stock} placeholder="Stock" className="admin-input"/></div>
          <input name="coverUrl" type="url" pattern="https://.*" defaultValue={editingBook?.coverUrl} placeholder="HTTPS cover URL" className="admin-input" />
          <input name="isbn" defaultValue={editingBook?.isbn} placeholder="ISBN (optional)" className="admin-input" />
          <input name="categories" defaultValue={editingBook?.categories.join(', ')} placeholder="Categories, comma separated" className="admin-input" />
          <textarea name="description" rows={5} maxLength={5000} defaultValue={editingBook?.description} placeholder="Description" className="admin-input" />
          <label className="flex items-center gap-2 text-sm text-slate-400"><input name="featured" type="checkbox" defaultChecked={editingBook?.featured}/> Feature this title</label>
          <button disabled={busy} className="button button--violet w-full">{busy ? 'Saving…' : editingBook ? 'Save catalog changes' : <>Publish book <PlusIcon size={16}/></>}</button>
          {editingBook ? <button type="button" onClick={() => setEditingBook(null)} className="button button--ghost w-full">Cancel editing</button> : null}
        </form>
      </section>

      <section className="space-y-10">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Inventory</p><h2 className="mt-1 text-2xl font-black">Catalog health</h2><p className="mt-1 text-xs text-slate-600">{bookMeta.total} titles</p></div><form onSubmit={applyBookSearch} className="flex w-full max-w-md gap-2"><label className="relative flex-1"><span className="sr-only">Search catalog</span><SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/><input value={bookSearchDraft} onChange={event => setBookSearchDraft(event.target.value)} placeholder="Search title, author…" className="field !min-h-10 pl-9"/></label><button className="button button--ghost !min-h-10">Search</button></form></div>
          {loadingBooks ? <div className="surface mt-4 h-28 animate-pulse rounded-2xl"/> : <div className="mt-4 grid gap-3 md:grid-cols-2">{books.map(book => <article key={book._id} className={`glass rounded-2xl p-4 ${editingBook?._id === book._id ? 'ring-1 ring-violet-400/60' : ''}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate font-black">{book.title}</p><p className="mt-1 truncate text-xs text-slate-500">{book.author}</p></div><span className={`chip shrink-0 ${book.stock <= 5 ? '!text-amber-200' : '!text-emerald-300'}`}>{book.stock} stock</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><strong>${book.price.toFixed(2)}</strong><div className="flex gap-2"><button type="button" onClick={() => { setEditingBook(book); setConfirmDelete(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="button button--ghost !min-h-9 !px-3">Edit</button><button type="button" onClick={() => void deleteBook(book._id)} className={`button !min-h-9 !px-2.5 ${confirmDelete === book._id ? 'button--danger' : 'button--ghost'}`} aria-label={confirmDelete === book._id ? `Confirm delete ${book.title}` : `Delete ${book.title}`}><TrashIcon size={15}/>{confirmDelete === book._id ? <span>Confirm</span> : null}</button></div></div></article>)}</div>}
          {!loadingBooks && books.length === 0 ? <p className="mt-4 text-sm text-slate-500">No catalog matches.</p> : null}
          <div className="mt-4 flex items-center justify-between gap-3"><button disabled={bookPage <= 1} onClick={() => setBookPage(page => Math.max(1, page - 1))} className="button button--ghost !min-h-9 disabled:opacity-40">Previous</button><span className="text-xs text-slate-600">Page {bookMeta.page} of {bookMeta.pages}</span><button disabled={bookPage >= bookMeta.pages} onClick={() => setBookPage(page => page + 1)} className="button button--ghost !min-h-9 disabled:opacity-40">Next</button></div>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">Fulfillment</p><h2 className="mt-1 text-2xl font-black">Order queue</h2><p className="mt-1 text-xs text-slate-600">{orderMeta.total} matching orders</p></div><form onSubmit={applyOrderFilters} className="grid w-full gap-2 sm:max-w-2xl sm:grid-cols-[1fr_170px_auto]"><input value={orderSearchDraft} onChange={event => setOrderSearchDraft(event.target.value)} placeholder="Order, reader, title, address…" className="field !min-h-10"/><select value={orderStatusDraft} onChange={event => setOrderStatusDraft(event.target.value)} className="field !min-h-10"><option value="">All statuses</option>{Object.keys(transitions).map(status => <option key={status} value={status}>{status}</option>)}</select><button className="button button--ghost !min-h-10">Filter</button></form></div>
          <div className="glass mt-4 overflow-hidden rounded-[1.4rem]"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 text-[10px] uppercase tracking-[.13em] text-slate-600"><tr><th className="p-4">Order</th><th className="p-4">Reader</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Next state</th></tr></thead><tbody>{orders.map(order => <tr key={order._id} className="border-b border-white/5 last:border-0"><td className="p-4 font-mono text-xs text-slate-400">…{order._id.slice(-8)}</td><td className="p-4"><strong className="block">{order.user?.name ?? 'Customer'}</strong><span className="text-xs text-slate-600">{order.user?.email}</span></td><td className="p-4 text-slate-400">{order.items.reduce((count, item) => count + item.quantity, 0)}</td><td className="p-4 font-black">${order.subtotal.toFixed(2)}</td><td className="p-4"><select value={order.status} onChange={event => void updateOrder(order._id, event.target.value as Order['status'])} className="field !min-h-10 !py-1.5">{transitions[order.status].map(status => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>{loadingOrders ? <p className="p-6 text-sm text-slate-500">Loading order queue…</p> : orders.length === 0 ? <p className="p-6 text-sm text-slate-500">No matching orders.</p> : null}</div>
          <div className="mt-4 flex items-center justify-between gap-3"><button disabled={orderPage <= 1} onClick={() => setOrderPage(page => Math.max(1, page - 1))} className="button button--ghost !min-h-9 disabled:opacity-40">Previous</button><span className="text-xs text-slate-600">Page {orderMeta.page} of {orderMeta.pages}</span><button disabled={orderPage >= orderMeta.pages} onClick={() => setOrderPage(page => page + 1)} className="button button--ghost !min-h-9 disabled:opacity-40">Next</button></div>
        </div>
      </section>
    </div>
  </main>;
}