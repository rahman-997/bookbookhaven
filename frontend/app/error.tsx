'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowRightIcon, BookIcon, ShieldIcon } from './components/Icons';

export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{console.error(error)},[error]);
  return <main className="page-shell py-16 md:py-24"><section className="surface mx-auto max-w-3xl overflow-hidden rounded-[2rem] p-7 text-center md:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-200/15 bg-amber-200/[.07] text-amber-200"><BookIcon size={28}/></div><p className="section-kicker mt-7">Recoverable error</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] md:text-5xl">A page fell out of the binding.</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">Something unexpected happened while preparing this view. No successful mutation is rolled back by simply reloading this screen.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={reset} className="button button--primary">Try this page again</button><Link href="/#library" className="button button--ghost">Return to library <ArrowRightIcon size={15}/></Link></div><div className="mx-auto mt-8 flex max-w-md items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-4 text-left"><ShieldIcon size={18} className="mt-0.5 shrink-0 text-emerald-300"/><p className="text-xs leading-5 text-slate-600">BookHaven keeps authentication, cart state and order writes behind explicit API operations rather than page rendering.</p></div></section></main>
}
