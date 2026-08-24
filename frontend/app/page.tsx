import Link from 'next/link';
import BookCard from './components/BookCard';
import BookCover from './components/BookCover';
import EmptyState from './components/EmptyState';
import { ArrowRightIcon, BookIcon, SearchIcon, ShieldIcon, SparkleIcon } from './components/Icons';
import { getBooks } from '@/lib/api';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const sort = typeof params.sort === 'string' ? params.sort : 'newest';
  const query = new URLSearchParams({ limit: '60', sort });
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  const books = await getBooks(query.toString());
  const categories = Array.from(new Set(books.flatMap(book => book.categories))).slice(0, 10);
  const featured = books.find(book => book.featured) ?? books[0];

  return <main>
    <section className="page-shell relative overflow-hidden pb-12 pt-12 md:pb-20 md:pt-20">
      <div className="hero-orb -left-28 top-8 h-64 w-64 bg-violet-500/10" />
      <div className="hero-orb right-2 top-16 h-52 w-52 bg-amber-300/8" />
      <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
        <div className="reveal max-w-4xl">
          <p className="eyebrow flex items-center gap-2"><SparkleIcon size={14}/> Curated reading, beautifully discovered</p>
          <h1 className="display-title mt-5">Find the book that changes your <span className="text-gradient">next chapter.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">A calm, editorial bookstore for ideas worth keeping. Search deeply, save what sparks you, review what moved you, and check out without a paid platform dependency.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#library" className="button button--primary"><BookIcon size={18}/> Explore library</a><Link href="/wishlist" className="button button--ghost">Saved reads <ArrowRightIcon size={17}/></Link></div>
          <div className="mt-9 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            <div className="metric"><p className="metric__label">Catalog</p><p className="metric__value">{books.length}</p></div>
            <div className="metric"><p className="metric__label">Categories</p><p className="metric__value">{categories.length || '—'}</p></div>
            <div className="metric"><p className="metric__label">Hosting</p><p className="metric__value">$0</p></div>
          </div>
        </div>
        {featured ? <aside className="reveal relative mx-auto w-full max-w-sm lg:max-w-[390px]" style={{ animationDelay: '100ms' }}>
          <div className="glass rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between"><span className="chip"><SparkleIcon size={13}/> Featured tonight</span><span className="text-xs font-bold text-slate-500">{featured.stock} copies</span></div>
            <Link href={`/books/${featured.slug}`} className="mx-auto mt-6 block w-[68%]"><BookCover book={featured} /></Link>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[.18em] text-amber-200/70">{featured.author}</p>
            <Link href={`/books/${featured.slug}`}><h2 className="mt-1 text-2xl font-black tracking-tight hover:text-amber-100">{featured.title}</h2></Link>
            <div className="mt-4 flex items-end justify-between gap-4"><p className="line-clamp-2 text-sm leading-6 text-slate-500">{featured.description}</p><strong className="shrink-0 text-xl">${featured.price.toFixed(2)}</strong></div>
          </div>
        </aside> : null}
      </div>
    </section>

    <section id="library" className="page-shell pb-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">The library</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Browse without the noise.</h2></div><div className="flex items-center gap-2 text-sm text-slate-500"><ShieldIcon size={16}/> Secure account-based cart</div></div>
      <form className="glass grid gap-3 rounded-[1.4rem] p-3 md:grid-cols-[1fr_210px_175px_auto]" action="/">
        <label className="relative"><span className="sr-only">Search books</span><SearchIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"/><input name="search" defaultValue={search} placeholder="Title, author, subject…" className="field pl-11" /></label>
        <label><span className="sr-only">Category</span><select name="category" defaultValue={category} className="field"><option value="">Every category</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label><span className="sr-only">Sort</span><select name="sort" defaultValue={sort} className="field"><option value="newest">Newest first</option><option value="price_asc">Price: low</option><option value="price_desc">Price: high</option><option value="title">Title A–Z</option></select></label>
        <button className="button button--violet">Refine</button>
      </form>
      {categories.length ? <div className="mt-4 flex gap-2 overflow-x-auto pb-2"> <Link href="/" className={`chip shrink-0 ${!category ? '!border-amber-200/30 !text-amber-100' : ''}`}>All shelves</Link>{categories.map(c => <Link key={c} href={`/?category=${encodeURIComponent(c)}`} className={`chip shrink-0 ${category === c ? '!border-amber-200/30 !text-amber-100' : ''}`}>{c}</Link>)}</div> : null}
    </section>

    <section className="page-shell pb-28 md:pb-24">
      {books.length ? <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{books.map(book => <BookCard key={book._id} book={book} />)}</div> : <EmptyState title="No titles found" description="Try a broader search or clear the active shelf filter." href="/" action="Reset filters" />}
    </section>
  </main>;
}
