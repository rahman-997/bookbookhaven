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
  const focusSearch = stringParam(params.focus, 20) === 'search';
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
  const featuredBooks = [...books.filter((book) => book.featured), ...books.filter((book) => !book.featured)].slice(0, 3);
  const featured = featuredBooks[0];
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
  const shelfHighlights = facets.categories.slice(0, 4);

  return <main>
    <section className="page-shell relative overflow-hidden pb-14 pt-10 md:pb-24 md:pt-16">
      <div className="hero-orb -left-28 top-6 h-72 w-72 bg-violet-500/10" />
      <div className="hero-orb right-4 top-16 h-60 w-60 bg-amber-300/8" />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.03fr_.97fr] lg:gap-8">
        <div className="reveal max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow flex items-center gap-2"><SparkleIcon size={14}/> Independent bookstore interface</p>
            <span className="chip"><span className="status-dot" aria-hidden="true"/> Live catalog</span>
          </div>
          <h1 className="display-title mt-6">Find the book that changes your <span className="text-gradient">next chapter.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">A sharper way to discover books worth keeping. Curated shelves, unmistakable BookHaven editions, account-based reading lists, verified inventory and a checkout flow built to stay portable.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#library" className="button button--primary"><BookIcon size={18}/> Explore the library</a><Link href="/wishlist" className="button button--ghost">Open saved shelf <ArrowRightIcon size={17}/></Link></div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            <div className="metric"><p className="metric__label">Titles</p><p className="metric__value">{facets.total}</p></div>
            <div className="metric"><p className="metric__label">Shelves</p><p className="metric__value">{facets.categories.length || '—'}</p></div>
            <div className="metric"><p className="metric__label">Showing</p><p className="metric__value">{pagination.total}</p></div>
          </div>
        </div>

        {featuredBooks.length ? <div className="hero-stage reveal" style={{ animationDelay: '90ms' }} aria-label="Featured BookHaven editions">
          {featuredBooks[1] ? <Link href={`/books/${featuredBooks[1].slug}`} className="hero-cover hero-cover--left" aria-label={`Open ${featuredBooks[1].title}`}><BookCover book={featuredBooks[1]} /></Link> : null}
          {featured ? <Link href={`/books/${featured.slug}`} className="hero-cover hero-cover--primary" aria-label={`Open featured title ${featured.title}`}><BookCover book={featured} priority /></Link> : null}
          {featuredBooks[2] ? <Link href={`/books/${featuredBooks[2].slug}`} className="hero-cover hero-cover--right" aria-label={`Open ${featuredBooks[2].title}`}><BookCover book={featuredBooks[2]} /></Link> : null}
          {featured ? <div className="absolute bottom-0 z-10 flex max-w-[28rem] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#080b14]/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200/70">Current curator pick</p><p className="mt-1 truncate text-sm font-black">{featured.title}</p></div><strong className="shrink-0 text-lg">${featured.price.toFixed(2)}</strong>
          </div> : null}
        </div> : null}
      </div>

      {shelfHighlights.length ? <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shelfHighlights.map((item, index) => <Link key={item.name} href={`/?category=${encodeURIComponent(item.name)}#library`} className="shelf-card group">
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-slate-600">Shelf {String(index + 1).padStart(2, '0')}</p>
          <h2 className="mt-3 text-xl font-black tracking-tight transition group-hover:text-amber-100">{categoryLabel(item.name)}</h2>
          <p className="mt-2 text-sm text-slate-500">{item.count} {item.count === 1 ? 'title' : 'titles'} curated in this collection.</p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-violet-300">Browse shelf <ArrowRightIcon size={14}/></span>
        </Link>)}
      </div> : null}
    </section>

    <section id="library" className="page-shell scroll-mt-24 pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">The library</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Browse without the noise.</h2><p id="catalog-results-summary" aria-live="polite" className="mt-2 text-sm text-slate-500">{pagination.total} matching {pagination.total === 1 ? 'title' : 'titles'} · page {pagination.page} of {pagination.pages}</p></div><div className="flex items-center gap-2 text-sm text-slate-500"><ShieldIcon size={16}/> Secure account-based cart</div></div>

      <form role="search" aria-label="Book catalog filters" className="surface grid gap-3 rounded-[1.5rem] p-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_180px_140px_140px_175px_auto]" action="/">
        <label><span className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Search</span><span className="relative block"><SearchIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"/><input id="catalog-search" name="search" defaultValue={search} maxLength={200} autoFocus={focusSearch} aria-describedby="catalog-results-summary" autoComplete="off" enterKeyHint="search" placeholder="Title, author, subject…" className="field pl-11" /></span></label>
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
      {books.length ? <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{books.map((book) => <BookCard key={book._id} book={book} />)}</div> : <EmptyState title="No titles found" description="Try a broader search, another shelf, or a wider price range." href="/#library" action="Reset filters" />}

      {pagination.pages > 1 ? <nav className="mt-14 flex flex-wrap items-center justify-center gap-2" aria-label="Catalog pagination">
        <Link href={hrefFor({ page: Math.max(1, page - 1) })} aria-disabled={page <= 1} className={`button button--ghost ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}>Previous</Link>
        <div className="flex items-center gap-1.5">
          {pageNumbers.map((number, index) => <Fragment key={number}>
            {index > 0 && number - pageNumbers[index - 1]! > 1 ? <span className="px-1 text-slate-600" aria-hidden="true">…</span> : null}
            <Link href={hrefFor({ page: number === 1 ? undefined : number })} aria-current={number === page ? 'page' : undefined} aria-label={`Go to catalog page ${number}`} className={`grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-black transition ${number === page ? 'border-amber-200/30 bg-amber-200/10 text-amber-100' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'}`}>{number}</Link>
          </Fragment>)}
        </div>
        <Link href={hrefFor({ page: Math.min(pagination.pages, page + 1) })} aria-disabled={page >= pagination.pages} className={`button button--ghost ${page >= pagination.pages ? 'pointer-events-none opacity-40' : ''}`}>Next</Link>
      </nav> : null}
    </section>
  </main>;
}
