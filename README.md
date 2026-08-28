# BookHaven

[![CI](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml/badge.svg)](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml)

![BookHaven product preview](https://raw.githubusercontent.com/rahman-997/portfolio/main/public/projects/bookhaven-cover.jpg)

**A production-oriented full-stack bookstore built around real commerce workflows, not only catalog CRUD.** BookHaven combines a Next.js 16 storefront with an Express 5 API, TypeScript, MongoDB/Mongoose, Zod validation, JWT authentication, role-based authorization, checkout/order workflows, inventory handling, operational admin tools, and automated API verification.

**Live:** [bookbookhaven-free.onrender.com](https://bookbookhaven-free.onrender.com) · **Case study:** [Portfolio](https://abdulrahman-hajar-dev.netlify.app/work/bookhaven/) · **Engineer:** [Abdulrahman Hajar](https://github.com/rahman-997)

> The zero-cost portfolio deployment can use an embedded ephemeral MongoDB when Atlas is not configured. Demo data can reset after a restart, and the free Render service may require a short wake-up.

---

## Engineering snapshot

| Area | Implementation |
| --- | --- |
| Frontend | Next.js 16 · React 19 · TypeScript |
| Backend | Express 5 · TypeScript · Zod 4 |
| Data | MongoDB · Mongoose · indexes |
| Auth | JWT + customer/admin RBAC |
| Commerce | Cart · wishlist · reviews · checkout · orders · inventory |
| Operations | Admin dashboard · order queue · low-stock visibility |
| Security | Helmet · CORS · request limits · rate limiting · production secret checks |
| Verification | Typecheck · Jest/Supertest · frontend/backend builds · GitHub Actions CI |
| Deployment | Single Render Free service + MongoDB Atlas M0 or embedded demo DB |

## System architecture

```text
Browser
  │
  ▼
Next.js App Router
  ├─ public Server Components
  └─ BFF Route Handlers
       │ HttpOnly cookie → Bearer JWT
       ▼
Express 5 API
  ├─ Zod validation
  ├─ authentication / RBAC
  ├─ controllers
  ├─ services
  └─ Mongoose models
       │
       ▼
MongoDB
```

The architecture keeps browser-facing session handling in Next.js while the API owns business rules, authorization, validation, and persistence.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the deeper design.

## Product capabilities

### Storefront

- Responsive catalog and editorial discovery
- Search, category filtering, and sorting
- SEO-aware book detail pages
- Stock visibility
- Persistent cart
- Persistent wishlist
- Reader ratings and reviews
- Checkout without requiring a paid payment provider
- Customer order history

### Admin operations

- Admin-only book creation and management
- Book, user, order, and review counts
- Low-stock metric
- Aggregate order value
- Order queue and status transitions
- Inventory restoration after valid cancellation

## Commerce reliability

The project includes several safeguards so commerce behavior is not just UI state:

- Checkout concurrency lock prevents duplicate orders from the same cart.
- Failed checkout compensates order, inventory, cart, and lock state.
- Atomic order-status transitions prevent duplicate cancellation restocks.
- Historical orders preserve title/price snapshots even when catalog data changes.
- Deleting a book cleans dependent cart, wishlist, and review references.

## API design

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Catalog

```text
GET    /api/v1/books
GET    /api/v1/books/slug/:slug
GET    /api/v1/books/:id
POST   /api/v1/books            admin
PATCH  /api/v1/books/:id        admin
DELETE /api/v1/books/:id        admin
```

### Cart and wishlist

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

### Reviews, orders, admin

```text
GET    /api/v1/reviews/book/:bookId
PUT    /api/v1/reviews/book/:bookId
DELETE /api/v1/reviews/:id

GET    /api/v1/orders
POST   /api/v1/orders
GET    /api/v1/orders/admin/all
PATCH  /api/v1/orders/admin/:id/status

GET    /api/v1/admin/stats
GET    /api/v1/health
```

## Backend quality controls

- Express 5 REST API
- TypeScript strict mode
- Zod request validation
- Centralized error handling
- Mongoose indexes and persistence models
- JWT authentication and role authorization
- Request IDs and structured access logging
- Helmet and explicit CORS handling
- Request-size limits and rate limiting
- Health/readiness route
- OpenAPI 3.1 contract
- Jest/Supertest API tests
- Safer image and backend proxy behavior

## UX hardening

The “Midnight Library” interface includes:

- responsive desktop/mobile product flows
- mobile navigation dock
- loading, empty, and error states
- accessible focus handling
- reduced-motion support
- redesigned cart, checkout, account, and admin flows

## Local development

### Docker Compose

```bash
cp .env.example .env
```

Set at least:

```env
JWT_SECRET=use-a-long-random-secret
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

### Separate frontend/backend development

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
INTERNAL_API_URL=http://localhost:3001/api/v1 npm run dev
```

## Verification

```bash
npm run typecheck
npm test
npm run build
```

CI runs backend typecheck/tests/build and frontend typecheck/build on pushes and pull requests.

## Zero-cost deployment profile

See [`FREE_HOSTING.md`](./FREE_HOSTING.md).

```text
GitHub Free
   ↓
Render Free Web Service
   ├─ Next.js public process
   └─ Express internal process on 127.0.0.1
   ↓
MongoDB Atlas M0 Free
or embedded MongoDB for ephemeral portfolio previews
```

Build:

```bash
npm run build:free
```

Start:

```bash
npm run start:free
```

The default checkout supports `cash_on_delivery` and `manual` settlement, so no paid transaction provider is required for the demo architecture.

## Key environment variables

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token lifetime |
| `CORS_ORIGIN` | Allowed frontend origin(s) |
| `ADMIN_EMAIL` | Seeded admin account |
| `ADMIN_PASSWORD` | Seeded admin password |
| `INTERNAL_API_URL` | Next.js → Express internal URL |
| `NEXT_PUBLIC_SITE_URL` | Canonical public site URL |
| `AUTO_SEED` | Idempotent seed in combined free-hosting mode |
| `BACKEND_PORT` | Internal Express port in combined hosting |

## Engineering evidence

- Real authentication and authorization boundaries
- Persistent commerce state
- Concurrency-aware checkout behavior
- Inventory compensation and cancellation guards
- Admin operational workflows
- Centralized validation and errors
- OpenAPI contract
- API test coverage
- Production secret/CORS hardening
- Free deployment architecture with durable or ephemeral data modes

## Author

Built by **[Abdulrahman Hajar](https://github.com/rahman-997)** — Software Engineer and Full-Stack Developer in Istanbul, Türkiye.
