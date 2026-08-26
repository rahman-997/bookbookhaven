# BookHaven 4.0

[![CI](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml/badge.svg)](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml)

![BookHaven product preview](https://raw.githubusercontent.com/rahman-997/portfolio/main/public/projects/bookhaven-cover.jpg)

BookHaven is a production-oriented full-stack bookstore built with **Next.js 16, React 19, Express 5, TypeScript, MongoDB/Mongoose and Zod 4**. It includes a zero-cost deployment profile designed for **GitHub + one Render Free service**, with MongoDB Atlas M0 for durable data or an automatic embedded demo database for portfolio previews.

**Live demo:** [bookbookhaven-free.onrender.com](https://bookbookhaven-free.onrender.com)  
**Portfolio case study:** [BookHaven engineering case study](https://abdulrahman-hajjar-dev.netlify.app/work/bookhaven/)  
**Developer profile:** [github.com/rahman-997](https://github.com/rahman-997)

> The portfolio deployment uses an ephemeral demo database when Atlas is not
> configured, so demo content can reset after a restart. The free instance may
> also take a short moment to wake after inactivity.

## What is included

### Storefront

- responsive catalog UI
- search, category filtering and sorting
- book detail pages with SEO metadata
- stock visibility
- persistent cart
- persistent wishlist
- reader ratings and reviews
- checkout without a paid payment provider
- customer order history

### Admin

- admin-only book creation
- operational dashboard
- book/user/order/review counts
- low-stock metric
- aggregate order value
- order queue and status management
- inventory restoration when an order is cancelled

### Backend

- Express 5 REST API
- TypeScript strict mode
- Zod request validation
- centralized error handling
- MongoDB/Mongoose persistence and indexes
- JWT authentication
- role-based authorization (`customer`, `admin`)
- request IDs and structured access logs
- Helmet, CORS, request limits and rate limiting
- health/readiness route
- OpenAPI 3.1 contract
- Jest/Supertest API tests

## Architecture

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
  ├─ auth/RBAC
  ├─ controllers
  ├─ services
  └─ Mongoose models
       │
       ▼
MongoDB
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design.

## Main API routes

```text
GET    /api/v1/health

POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/books
GET    /api/v1/books/slug/:slug
GET    /api/v1/books/:id
POST   /api/v1/books                    admin
PATCH  /api/v1/books/:id                admin
DELETE /api/v1/books/:id                admin

GET    /api/v1/cart                     auth
POST   /api/v1/cart/items               auth
PATCH  /api/v1/cart/items/:bookId       auth
DELETE /api/v1/cart/items/:bookId       auth
DELETE /api/v1/cart                     auth

GET    /api/v1/wishlist                 auth
POST   /api/v1/wishlist/:bookId         auth
DELETE /api/v1/wishlist/:bookId         auth

GET    /api/v1/reviews/book/:bookId
PUT    /api/v1/reviews/book/:bookId     auth
DELETE /api/v1/reviews/:id              owner/admin

GET    /api/v1/orders                   auth
POST   /api/v1/orders                   auth
GET    /api/v1/orders/admin/all         admin
PATCH  /api/v1/orders/admin/:id/status  admin

GET    /api/v1/admin/stats              admin
```

## Run with Docker Compose

```bash
cp .env.example .env
```

Change at least:

```env
JWT_SECRET=use-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-unique-password
```

Then:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Seed demo data:

```bash
docker compose exec backend npm run seed
```

## Local development

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

## $0 hosting profile

See [`FREE_HOSTING.md`](./FREE_HOSTING.md).

Recommended setup:

```text
GitHub Free
   ↓
Render Free Web Service
   ├─ Next.js public process
   └─ Express internal process on 127.0.0.1
   ↓
MongoDB Atlas M0 Free (durable) or embedded MongoDB (ephemeral demo)
```

Build command:

```bash
npm run build:free
```

Start command:

```bash
npm run start:free
```

No Stripe or paid transaction API is required. The default checkout supports `cash_on_delivery` and `manual` settlement.

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | token lifetime, default `7d` |
| `CORS_ORIGIN` | allowed frontend origin(s) |
| `ADMIN_EMAIL` | seeded admin account |
| `ADMIN_PASSWORD` | seeded admin password |
| `INTERNAL_API_URL` | Next.js → Express internal URL |
| `NEXT_PUBLIC_SITE_URL` | canonical public site URL |
| `AUTO_SEED` | idempotent seed on combined free hosting |
| `BACKEND_PORT` | internal Express port in combined hosting |

## Notes

- Do not commit `.env` files or real secrets.
- When `MONGO_URI` is missing, free-hosting mode automatically starts an ephemeral embedded MongoDB and seeds demo data. Its contents reset when the service is rebuilt or restarted; use Atlas for durable production data.
- Free hosting can cold-start after inactivity.
- The order flow is appropriate for demos, portfolios and small manual-fulfillment stores. A real online payment provider can be added later behind the order service.

## 4.0 quality & UX hardening

- Premium responsive “Midnight Library” visual system with mobile dock, editorial discovery, accessible focus/reduced-motion states, loading/error/empty states, and redesigned cart/checkout/account/admin flows.
- Checkout concurrency lock prevents duplicate orders from the same cart; failed checkout compensates order, inventory, cart and lock state.
- Atomic order-status transition guard prevents duplicate cancellation restocks.
- Centralized request validation/errors, stricter production secrets/CORS checks, HTTPS-only cover URLs, safer image delivery and backend proxy timeouts.
- Deleting a book cleans dependent cart, wishlist and review data while historical orders retain their title/price snapshots.
