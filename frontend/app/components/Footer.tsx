import Link from 'next/link';
import { BookIcon, HeartIcon, ShieldIcon } from './Icons';

export default function Footer() {
  return <footer className="mt-16 border-t border-white/[.07] bg-black/10">
    <div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_.8fr_.8fr]">
      <div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-200/15 bg-amber-200/[.07] text-amber-200"><BookIcon size={20}/></span><span className="text-lg font-black tracking-tight">BookHaven</span></div><p className="mt-4 max-w-md text-sm leading-7 text-slate-500">A thoughtful bookstore experience built on a zero-cost-friendly full-stack architecture. Discover slowly. Read deeply.</p></div>
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Explore</p><nav className="mt-4 grid gap-2 text-sm text-slate-400"><Link href="/">Discover</Link><Link href="/wishlist">Saved books</Link><Link href="/orders">Orders</Link><Link href="/account">Account</Link></nav></div>
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Built with care</p><div className="mt-4 space-y-3 text-sm text-slate-500"><p className="flex items-center gap-2"><ShieldIcon size={16}/> HTTP-only session cookie</p><p className="flex items-center gap-2"><HeartIcon size={16}/> Persistent wishlist & cart</p></div></div>
    </div>
    <div className="border-t border-white/[.06]"><div className="page-shell flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-slate-600"><span>© {new Date().getFullYear()} BookHaven</span><span>Next.js · Express · MongoDB</span></div></div>
  </footer>;
}
