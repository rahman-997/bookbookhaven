'use client';
import { useEffect } from 'react';
import { BookIcon } from './components/Icons';
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error(error)},[error]);return <main className="page-shell py-20"><div className="empty-state"><div className="empty-state__icon"><BookIcon size={28}/></div><h2>A page fell out of the binding.</h2><p>Something unexpected happened while preparing this view. Your account data has not been changed.</p><button onClick={reset} className="button button--primary">Try this page again</button></div></main>}
