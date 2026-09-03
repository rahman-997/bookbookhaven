'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookIcon, CartIcon, HeartIcon, MenuIcon, PackageIcon, SearchIcon, UserIcon, XIcon } from './Icons';

type User = { name: string; role: 'customer' | 'admin' };
const links = [
  { href: '/', label: 'Library' },
  { href: '/wishlist', label: 'Saved shelf' },
  { href: '/orders', label: 'Order journal' }
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    const response = await fetch('/api/backend/cart', { cache: 'no-store' }).catch(() => null);
    if (!response?.ok) { setCartCount(0); return; }
    const payload = await response.json();
    setCartCount((payload.data?.items ?? []).reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0));
  }, []);

  useEffect(() => {
    void fetch('/api/backend/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        setUser((await response.json()).data);
        await refreshCart();
      })
      .catch(() => undefined);
  }, [refreshCart]);

  useEffect(() => {
    const listener = () => void refreshCart();
    window.addEventListener('bookhaven:cart-changed', listener);
    return () => window.removeEventListener('bookhaven:cart-changed', listener);
  }, [refreshCart]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    firstMobileLinkRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      queueMicrotask(() => menuButtonRef.current?.focus());
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function logout() {
    await fetch('/api/session/logout', { method: 'POST' });
    setUser(null); setCartCount(0); setOpen(false); router.push('/'); router.refresh();
  }

  return <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#05070d]/82 backdrop-blur-2xl">
    <div className="page-shell flex h-[74px] items-center justify-between gap-4">
      <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="BookHaven home">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-200/15 bg-gradient-to-br from-amber-200/14 via-violet-400/10 to-transparent text-amber-200 shadow-lg shadow-black/20 transition group-hover:-rotate-3 group-hover:border-amber-200/25"><BookIcon size={20}/></span>
        <span><span className="block text-lg font-black tracking-[-.04em]">Book<span className="text-amber-200">Haven</span></span><span className="hidden text-[9px] font-black uppercase tracking-[.16em] text-slate-700 sm:block">Independent digital bookstore</span></span>
      </Link>

      <nav className="hidden items-center rounded-2xl border border-white/[.07] bg-white/[.022] p-1 md:flex" aria-label="Primary navigation">
        {links.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`rounded-xl px-4 py-2 text-xs font-black transition ${active ? 'bg-white/[.075] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>{label}</Link>;
        })}
      </nav>

      <div className="hidden items-center gap-2 md:flex">
        <Link href="/?focus=search#library" className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.07] bg-white/[.025] text-slate-400 transition hover:border-violet-300/20 hover:text-white" aria-label="Search books"><SearchIcon size={18}/></Link>
        <Link href="/cart" className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/[.07] bg-white/[.025] text-slate-300 transition hover:border-amber-200/20 hover:text-white" aria-label={`Cart with ${cartCount} items`}><CartIcon size={18}/>{cartCount > 0 ? <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-[#05070d] bg-amber-300 px-1 text-[10px] font-black text-slate-950">{cartCount > 99 ? '99+' : cartCount}</span> : null}</Link>
        <span className="sr-only" aria-live="polite" aria-atomic="true">{cartCount} {cartCount === 1 ? 'item' : 'items'} in cart</span>
        {user?.role === 'admin' ? <Link href="/admin" className="button button--ghost !min-h-10 !px-3 text-amber-200">Admin</Link> : null}
        {user ? <Link href="/account" className="flex h-10 items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 text-xs font-black text-slate-200"><span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-400/15 text-[9px] font-black text-violet-200">{user.name.slice(0,2).toUpperCase()}</span>{user.name.split(' ')[0]}</Link> : <Link href="/login" className="button button--primary !min-h-10">Sign in</Link>}
      </div>

      <button ref={menuButtonRef} onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.03] text-slate-200 md:hidden" aria-expanded={open} aria-controls="mobile-header-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <XIcon size={19}/> : <MenuIcon size={19}/>}</button>
    </div>

    {open ? <nav id="mobile-header-navigation" aria-label="Mobile primary navigation" className="border-t border-white/[.06] bg-[#080b15]/96 p-3 backdrop-blur-2xl md:hidden"><div className="page-shell grid gap-1">
      <Link ref={firstMobileLinkRef} href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-200"><BookIcon size={18}/>Library</Link>
      <Link href="/?focus=search#library" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-200"><SearchIcon size={18}/>Search books</Link>
      <Link href="/wishlist" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-200"><HeartIcon size={18}/>Saved shelf</Link>
      <Link href="/orders" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-200"><PackageIcon size={18}/>Order journal</Link>
      <Link href="/cart" className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-200"><span className="flex items-center gap-3"><CartIcon size={18}/>Reading stack</span>{cartCount ? <span className="rounded-full bg-amber-200/10 px-2 py-1 text-xs text-amber-200">{cartCount}</span> : null}</Link>
      {user ? <><Link href="/account" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-200"><UserIcon size={18}/>Reader account</Link>{user.role === 'admin' ? <Link href="/admin" className="rounded-xl px-3 py-3 text-sm font-semibold text-amber-200">Admin command center</Link> : null}<button onClick={logout} className="mt-1 rounded-xl border border-white/[.08] px-3 py-3 text-left text-sm text-slate-400">Sign out</button></> : <Link href="/login" className="button button--primary mt-2">Sign in</Link>}
    </div></nav> : null}
  </header>;
}
