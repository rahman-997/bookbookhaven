# BookHaven

[![CI](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml/badge.svg)](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml)

![BookHaven product preview](https://raw.githubusercontent.com/rahman-997/portfolio/main/public/projects/bookhaven-cover.jpg)

**BookHaven is a production-oriented full-stack bookstore built around real commerce workflows, concurrency-safe inventory, private browser sessions, scalable catalog/fulfillment operations, and a polished portfolio-grade storefront.**

**Live:** [bookbookhaven-free.onrender.com](https://bookbookhaven-free.onrender.com) · **Case study:** [Portfolio](https://abdulrahman-hajar-portfolio.onrender.com/work/bookhaven/) · **Engineer:** [Abdulrahman Hajar](https://github.com/rahman-997)

> Use MongoDB Atlas M0 through `MONGO_URI` for durable production/demo data. The free hosting launcher can also use a disposable embedded MongoDB for portfolio previews; that fallback can reset after sleep, restart, or redeploy.

## Engineering snapshot

| Area | Implementation |
| --- | --- |
| Frontend | Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 |
| Backend | Express 5 · strict TypeScript · Zod 4 |
| Data | MongoDB · Mongoose · indexes · optimistic concurrency · adaptive transactions |
| Auth | JWT · bcrypt · HttpOnly BFF session · customer/admin RBAC |
| Commerce | Cart · wishlist · paginated reviews · checkout · orders · inventory |
| Operations | Paginated/searchable admin catalog · fulfillment queue · metrics · low-stock visibility |
| Security | Helmet · CSP/HSTS · explicit credentialed CORS · rate limits · body limits · same-origin BFF guard · production secret checks |
| Verification | npm lockfiles + `npm ci` · runtime dependency audits · Jest/Supertest · replica-set transaction test · typecheck · production builds · GitHub Actions |
| SEO | Dynamic book metadata · canonical URLs · OpenGraph/Twitter · JSON-LD · paginated sitemap |
| Deployment | Docker Compose · Render Free standalone Next.js runtime · MongoDB Atlas M0 |

## Architecture

```text
Browser
  ↓ HTTPS
Next.js App Router
  ├─ public Server Components
  ├─ SEO metadata / sitemap
  └─ same-origin BFF Route Handlers
       ↓ HttpOnly JWT → Authorization header
Express 5 API
  ├─ validation / auth / RBAC
  ├─ controllers
  └─ services
       ↓
Mongoose / MongoDB
  ├─ Atlas/replica set → transactions
  └─ standalone/local → compensation fallback
```

The browser does not need direct access to the API JWT. Business logic remains in Express services, while Next.js owns the browser-facing session boundary and presentation layer. Render is only a deployment profile; application code is provider-neutral.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the detailed consistency and security model.

## Storefront capabilities

- Responsive mobile-first catalog and editorial discovery
- Server-backed pagination, search, category/author/price filters, featured filtering and sorting
- SEO-rich book detail pages with Schema.org structured data
- Related-book recommendations
- Live stock visibility
- Persistent cart with concurrency-safe mutations
- Persistent wishlist with duplicate prevention
- Paginated ratings/reviews with aggregate rating metadata
- Cash-on-delivery and manual-payment checkout
- Customer order history, status filters, pagination and owned order-detail pages

## Admin capabilities

- Server-protected admin RBAC
- Create, edit and delete books
- Stock management and featured toggle
- Paginated/searchable catalog management
- Paginated/searchable/filterable order queue
- Guarded order-state transitions
- Dashboard metrics for books, users, orders, reviews, low stock and order value
- Inventory restoration after valid cancellation
- Protection against deleting books required by active orders

## Commerce reliability

BookHaven treats commerce state as database state—not browser state:

- Persistent MongoDB cart with Mongoose optimistic concurrency and bounded retry handling
- Versioned checkout lock prevents stale cart writes from overwriting an active checkout
- Conditional stock decrements prevent overselling across concurrent customers
- Duplicate checkout requests compete for the same cart lock
- Atlas/replica-set deployments automatically use MongoDB transactions for checkout and cancellation
- Standalone/local MongoDB automatically uses a compensation fallback instead of requiring a replica set
- Failed fallback checkout restores successfully decremented inventory, removes partial orders, restores surviving cart references and releases the lock
- Compare-and-set order transitions prevent duplicate lifecycle mutations
- Cancellation restores inventory once; transactional deployments restore stock/status atomically
- Order line items preserve title and unit-price snapshots
- Active orders block destructive catalog deletion needed for later cancellation

## API surface

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Books

```text
GET    /api/v1/books
GET    /api/v1/books/slug/:slug
GET    /api/v1/books/:id
POST   /api/v1/books            admin
PATCH  /api/v1/books/:id        admin
DELETE /api/v1/books/:id        admin
```

Books support bounded pagination, text search, author/category/featured filters, min/max price and sorting. Slug and normalized ISBN are unique; ISBN-10/ISBN-13 checksums are validated.

### Cart / wishlist

```text
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:bookId
DELETE /api/v1/cart/items/:bookId
DELETE /api/v1/cart

GET    /api/v1/wishlist
POST   /api/v1/wishlist/:bookId
DELETE /api/v1/wishlist/:bookId
```

### Reviews / orders / admin

```text
GET    /api/v1/reviews/book/:bookId?page=1&limit=20
PUT    /api/v1/reviews/book/:bookId
DELETE /api/v1/reviews/:id

GET    /api/v1/orders?page=1&limit=20&status=pending
GET    /api/v1/orders/:id
POST   /api/v1/orders
GET    /api/v1/orders/admin/all?page=1&limit=50&status=pending&search=...
PATCH  /api/v1/orders/admin/:id/status

GET    /api/v1/admin/stats
GET    /api/v1/health
```

The authoritative REST contract is [`docs/openapi.yaml`](./docs/openapi.yaml) using OpenAPI 3.1.

## Security controls

- Production secret/environment validation
- bcrypt password hashing
- JWT authentication and API-side RBAC
- HttpOnly, Secure-in-production, SameSite session cookie at the Next.js BFF boundary
- Same-origin mutation protection
- Helmet headers plus production CSP and HSTS at the public Next.js boundary
- `X-Powered-By` disabled and defensive browser headers enabled
- Explicit credentialed CORS configuration
- Rate limiting, including tighter auth limits
- Request-body size limits
- Zod body/query/path validation
- Safe centralized error responses with request IDs
- Structured access logging
- CI and Render builds fail on high/critical runtime dependency audit findings

## Local development

### Docker Compose

```bash
cp .env.example .env
```

Configure at least:

```env
JWT_SECRET=use-a-long-random-secret-at-least-32-characters
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-unique-password
```

Then:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

Seed demo data:

```bash
docker compose exec backend npm run seed
```

### Separate processes

Backend:

```bash
cd backend
npm ci
cp .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm ci
INTERNAL_API_URL=http://localhost:3001/api/v1 npm run dev
```

The committed npm lockfiles are the dependency source of truth for CI, Docker and production builds. Update them intentionally whenever package manifests change.

## Verification

Full project verification, including production dependency audits:

```bash
npm run verify
```

Individual checks remain available through `npm run typecheck`, `npm test`, `npm run build`, and `npm run audit:prod`.

Production/free-hosting gate:

```bash
npm run build:free
```

`build:free` performs deterministic backend `npm ci` → runtime dependency audit → typecheck → tests → build → deterministic frontend `npm ci` → runtime dependency audit → typecheck → build. Any failure blocks deployment. GitHub Actions performs the same checks for pushes and pull requests, caches npm downloads by lockfile hash, and verifies the standalone frontend artifact.

## Zero-cost deployment

See [`FREE_HOSTING.md`](./FREE_HOSTING.md).

```text
GitHub Free
   ↓ auto deploy from main
Render Free Web Service
   ├─ Next.js standalone public runtime
   └─ Express internal runtime on 127.0.0.1
   ↓
MongoDB Atlas M0 Free
or disposable embedded MongoDB for portfolio preview
```

Build:

```bash
npm run build:free
```

Start:

```bash
npm run start:free
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Durable MongoDB connection string; absent/setup sentinel enables disposable demo mode |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT/session lifetime |
| `CORS_ORIGIN` | Explicit allowed frontend origin(s) |
| `ADMIN_EMAIL` | Seed/admin account email |
| `ADMIN_PASSWORD` | Seed/admin account password |
| `INTERNAL_API_URL` | Next.js → private Express URL |
| `NEXT_PUBLIC_SITE_URL` | Canonical public site URL |
| `AUTO_SEED` | Optional idempotent demo seed in combined hosting |
| `BACKEND_PORT` | Private Express port in combined hosting |

## Author

Built by **[Abdulrahman Hajar](https://github.com/rahman-997)** — Software Engineer and Full-Stack Developer in Istanbul, Türkiye.
