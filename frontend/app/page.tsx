import { Fragment } from 'react';
import Link from 'next/link';
import BookCard from './components/BookCard';
import BookCover from './components/BookCover';
import EmptyState from './components/EmptyState';
import { ArrowRightIcon, BookIcon, SearchIcon, ShieldIcon, SparkleIcon } from './components/Icons';
import { getBooksPage, getCatalogFacets } from '@/lib/api';

const PAGE_SIZE = 24;
const SORT_VALUES = new Set(['newest', 'oldest', 'price_asc', 'price_desc', 'title']);

function stringParam(value: string | string[] | undefined, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function positiveInt(value: string | string[] | undefined) {
  if (typeof value !== 'string') return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function moneyParam(value: string | string[] | undefined) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function categoryLabel(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = stringParam(params.search, 200);
  const category = stringParam(params.category, 80).toLowerCase();
  const requestedSort = stringParam(params.sort, 32);
  const sort = SORT_VALUES.has(requestedSort) ? requestedSort : 'newest';
  const page = positiveInt(params.page);
  const minPrice = moneyParam(params.minPrice);
  const maxPrice = moneyParam(params.maxPrice);
  const priceRangeInvalid = minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice;

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  if (!priceRangeInvalid && minPrice !== undefined) query.set('minPrice', String(minPrice));
  if (!priceRangeInvalid && maxPrice !== undefined) query.set('maxPrice', String(maxPrice));

  const [{ items: books, pagination }, facets] = await Promise.all([
    getBooksPage(query.toString()),
    getCatalogFacets()
  ]);
  const featured = books.find((book) => book.featured) ?? books[0];
  const hasFilters = Boolean(search || category || minPrice !== undefined || maxPrice !== undefined || sort !== 'newest');

  const activeParams = new URLSearchParams();
  if (search) activeParams.set('search', search);
  if (category) activeParams.set('category', category);
  if (sort !== 'newest') activeParams.set('sort', sort);
  if (minPrice !== undefined) activeParams.set('minPrice', String(minPrice));
  if (maxPrice !== undefined) activeParams.set('maxPrice', String(maxPrice));
  if (page > 1) activeParams.set('page', String(page));

  function hrefFor(updates: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(activeParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    const queryString = next.toString();
    return queryString ? `/?${queryString}#library` : '/#library';
  }

  const pageNumbers = Array.from(new Set([1, pagination.pages, page - 1, page, page + 1]))
    .filter((value) => value >= 1 && value <= pagination.pages)
    .sort((a, b) => a - b);

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
            <div className="metric"><p className="metric__label">Catalog</p><p className="metric__value">{facets.total}</p></div>
            <div className="metric"><p className="metric__label">Categories</p><p className="metric__value">{facets.categories.length || '—'}</p></div>
            <div className="metric"><p className="metric__label">Results</p><p className="metric__value">{pagination.total}</p></div>
          </div>
        </div>
        {featured ? <aside className="reveal relative mx-auto w-full max-w-sm lg:max-w-[390px]" style={{ animationDelay: '100ms' }}>
          <div className="glass rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between"><span className="chip"><SparkleIcon size={13}/> Featured selection</span><span className="text-xs font-bold text-slate-500">{featured.stock} copies</span></div>
            <Link href={`/books/${featured.slug}`} className="mx-auto mt-6 block w-[68%]"><BookCover book={featured} /></Link>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[.18em] text-amber-200/70">{featured.author}</p>
            <Link href={`/books/${featured.slug}`}><h2 className="mt-1 text-2xl font-black tracking-tight hover:text-amber-100">{featured.title}</h2></Link>
            <div className="mt-4 flex items-end justify-between gap-4"><p className="line-clamp-2 text-sm leading-6 text-slate-500">{featured.description}</p><strong className="shrink-0 text-xl">${featured.price.toFixed(2)}</strong></div>
          </div>
        </aside> : null}
      </div>
    </section>

    <section id="library" className="page-shell scroll-mt-24 pb-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">The library</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Browse without the noise.</h2><p className="mt-2 text-sm text-slate-500">{pagination.total} matching {pagination.total === 1 ? 'title' : 'titles'} · page {pagination.page} of {pagination.pages}</p></div><div className="flex items-center gap-2 text-sm text-slate-500"><ShieldIcon size={16}/> Secure account-based cart</div></div>

      <form className="glass grid gap-3 rounded-[1.4rem] p-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_180px_140px_140px_175px_auto]" action="/">
        <label><span className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Search</span><span className="relative block"><SearchIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"/><input name="search" defaultValue={search} maxLength={200} placeholder="Title, author, subject…" className="field pl-11" /></span></label>
        <label><span className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Category</span><select name="category" defaultValue={category} className="field"><option value="">Every category</option>{facets.categories.map((item) => <option key={item.name} value={item.name}>{categoryLabel(item.name)} ({item.count})</option>)}</select></label>
        <label><span className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Min price</span><input name="minPrice" type="number" min="0" step="0.01" defaultValue={minPrice} placeholder={facets.total ? `$${facets.price.min.toFixed(0)}` : '$0'} className="field" /></label>
        <label><span className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Max price</span><input name="maxPrice" type="number" min="0" step="0.01" defaultValue={maxPrice} placeholder={facets.total ? `$${facets.price.max.toFixed(0)}` : '$0'} className="field" /></label>
        <label><span className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Sort</span><select name="sort" defaultValue={sort} className="field"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price_asc">Price: low</option><option value="price_desc">Price: high</option><option value="title">Title A–Z</option></select></label>
        <div className="flex items-end"><button className="button button--violet w-full">Refine</button></div>
      </form>

      {priceRangeInvalid ? <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">Minimum price must be lower than or equal to maximum price. The invalid price range was not applied.</p> : null}

      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
        <Link href={hrefFor({ category: undefined, page: undefined })} className={`chip shrink-0 ${!category ? '!border-amber-200/30 !text-amber-100' : ''}`}>All shelves <span className="text-slate-500">{facets.total}</span></Link>
        {facets.categories.map((item) => <Link key={item.name} href={hrefFor({ category: item.name, page: undefined })} className={`chip shrink-0 ${category === item.name ? '!border-amber-200/30 !text-amber-100' : ''}`}>{categoryLabel(item.name)} <span className="text-slate-500">{item.count}</span></Link>)}
      </div>

      {hasFilters ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>Filters are encoded in the URL, so this view can be bookmarked or shared.</span><Link href="/#library" className="font-bold text-amber-100 hover:text-white">Clear all filters</Link></div> : null}
    </section>

    <section className="page-shell pb-28 md:pb-24">
      {books.length ? <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{books.map((book) => <BookCard key={book._id} book={book} />)}</div> : <EmptyState title="No titles found" description="Try a broader search, another shelf, or a wider price range." href="/#library" action="Reset filters" />}

      {pagination.pages > 1 ? <nav className="mt-14 flex flex-wrap items-center justify-center gap-2" aria-label="Catalog pagination">
        <Link href={hrefFor({ page: Math.max(1, page - 1) })} aria-disabled={page <= 1} className={`button button--ghost ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}>Previous</Link>
        <div className="flex items-center gap-1.5">
          {pageNumbers.map((number, index) => <Fragment key={number}>
            {index > 0 && number - pageNumbers[index - 1]! > 1 ? <span className="px-1 text-slate-600" aria-hidden="true">…</span> : null}
            <Link href={hrefFor({ page: number === 1 ? undefined : number })} aria-current={number === page ? 'page' : undefined} className={`grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-black transition ${number === page ? 'border-amber-200/30 bg-amber-200/10 text-amber-100' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'}`}>{number}</Link>
          </Fragment>)}
        </div>
        <Link href={hrefFor({ page: Math.min(pagination.pages, page + 1) })} aria-disabled={page >= pagination.pages} className={`button button--ghost ${page >= pagination.pages ? 'pointer-events-none opacity-40' : ''}`}>Next</Link>
      </nav> : null}
    </section>
  </main>;
}
