import Link from 'next/link';
import { ArrowRightIcon, BookIcon, HeartIcon, ShieldIcon } from './Icons';

export default function Footer() {
  return <footer className="mt-20 border-t border-white/[.07] bg-black/15">
    <div className="page-shell py-12 md:py-16">
      <div className="editorial-card grid gap-8 p-6 md:grid-cols-[1.2fr_.8fr] md:p-8">
        <div><p className="section-kicker">BookHaven editions</p><h2 className="mt-2 max-w-2xl text-3xl font-black tracking-[-.045em] md:text-4xl">A bookstore interface designed around the books, not the platform.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">Portable infrastructure, account-bound reading state, verified stock and a visual system that gives every title its own place on the shelf.</p></div>
        <div className="flex items-end md:justify-end"><Link href="/#library" className="button button--primary">Browse the library <ArrowRightIcon size={16}/></Link></div>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_.8fr_.8fr]">
        <div><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-200/15 bg-amber-200/[.07] text-amber-200"><BookIcon size={20}/></span><div><span className="text-lg font-black tracking-tight">Book<span className="text-amber-200">Haven</span></span><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-600">Independent digital bookstore</p></div></div><p className="mt-4 max-w-md text-sm leading-7 text-slate-500">Discover slowly, save deliberately and keep the books that change how you work or think.</p></div>
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-slate-600">Explore</p><nav className="mt-4 grid gap-2.5 text-sm text-slate-400"><Link href="/#library" className="hover:text-amber-100">Library</Link><Link href="/wishlist" className="hover:text-amber-100">Saved shelf</Link><Link href="/orders" className="hover:text-amber-100">Order journal</Link><Link href="/account" className="hover:text-amber-100">Reader account</Link></nav></div>
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-slate-600">Built with care</p><div className="mt-4 space-y-3 text-sm text-slate-500"><p className="flex items-center gap-2"><ShieldIcon size={16}/> HTTP-only sessions</p><p className="flex items-center gap-2"><HeartIcon size={16}/> Persistent wishlist & cart</p><p className="flex items-center gap-2"><span className="status-dot" aria-hidden="true"/> Runtime health checks</p></div></div>
      </div>
    </div>
    <div className="border-t border-white/[.06]"><div className="page-shell flex flex-wrap items-center justify-between gap-2 py-5 text-[11px] font-semibold uppercase tracking-[.08em] text-slate-700"><span>© {new Date().getFullYear()} BookHaven</span><span>Next.js · Express · MongoDB · portable runtime</span></div></div>
  </footer>;
}
