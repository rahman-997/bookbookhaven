'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { ArrowRightIcon, BagIcon, HeartIcon, PackageIcon, ShieldIcon, UserIcon } from '@/app/components/Icons';
type User={id:string;name:string;email:string;role:'customer'|'admin'};

export default function AccountPage(){
  const[user,setUser]=useState<User|null>(null);
  const[message,setMessage]=useState('Loading your reader profile…');
  useEffect(()=>{void(async()=>{const r=await fetch('/api/backend/auth/me',{cache:'no-store'});if(r.status===401){setMessage('Sign in to view your account.');return}if(!r.ok){setMessage('Could not load your account.');return}const p=await r.json();setUser(p.data);setMessage('')})()},[]);
  const links=[['Order journal','Track every purchase from pending to complete','/orders',<PackageIcon key="o" size={21}/>],['Saved shelf','Return to the titles you marked for later','/wishlist',<HeartIcon key="w" size={21}/>],['Reading stack','Review the books currently waiting in your cart','/cart',<BagIcon key="c" size={21}/>]];
  return <main className="page-shell pb-28 pt-10 md:pb-20 md:pt-14">
    <div className="max-w-4xl"><p className="section-kicker">Reader profile</p><h1 className="mt-2 text-4xl font-black tracking-[-.045em] md:text-6xl">Your corner of BookHaven.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">One account connects the books you save, the stack you build, the reviews you leave and every order you place.</p></div>
    {message?<div aria-live="polite" className="notice mt-8">{message} {message.startsWith('Sign')?<Link href="/login" className="ml-2 font-bold text-amber-200 underline">Sign in</Link>:null}</div>:null}
    {user?<div className="mt-9 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <section className="surface rounded-[1.8rem] p-6 md:p-7"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-100/20 bg-gradient-to-br from-amber-200 to-violet-400 text-xl font-black text-slate-950 shadow-xl shadow-black/20">{user.name.slice(0,2).toUpperCase()}</div><div className="min-w-0"><div className="flex items-center gap-2"><span className="status-dot" aria-hidden="true"/><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-600">Active {user.role}</p></div><h2 className="mt-1 truncate text-2xl font-black tracking-tight">{user.name}</h2><p className="truncate text-sm text-slate-500">{user.email}</p></div></div>
        <div className="editorial-card mt-7 p-5"><div className="flex gap-3"><ShieldIcon size={20} className="shrink-0 text-amber-200"/><div><strong className="text-sm">Account-bound library</strong><p className="mt-1 text-xs leading-5 text-slate-500">Your cart, wishlist, reviews and orders belong to this reader identity instead of a single browser session.</p></div></div></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="metric"><p className="metric__label">Session</p><p className="mt-2 text-sm font-black">HTTP-only</p></div><div className="metric"><p className="metric__label">Role</p><p className="mt-2 text-sm font-black capitalize">{user.role}</p></div></div>
        {user.role==='admin'?<Link href="/admin" className="button button--violet mt-5 w-full"><UserIcon size={17}/> Open command center</Link>:null}
      </section>
      <section className="grid gap-3">{links.map(([title,desc,href,icon],index)=><Link key={String(title)} href={String(href)} className="editorial-card group flex items-center gap-4 p-5 transition hover:border-white/20 hover:bg-white/[.04]"><span className="hidden text-[10px] font-black tracking-[.15em] text-slate-700 sm:block">0{index+1}</span><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] text-amber-200">{icon}</div><div className="min-w-0 flex-1"><strong className="text-lg tracking-tight">{title}</strong><p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p></div><ArrowRightIcon size={18} className="shrink-0 text-slate-700 transition group-hover:translate-x-1 group-hover:text-amber-200"/></Link>)}</section>
    </div>:null}
  </main>
}
