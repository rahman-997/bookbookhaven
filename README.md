# BookHaven

[![CI](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml/badge.svg)](https://github.com/rahman-997/bookbookhaven/actions/workflows/ci.yml)

![BookHaven product preview](https://raw.githubusercontent.com/rahman-997/portfolio/main/public/projects/bookhaven-cover.jpg)

**BookHaven is a production-oriented full-stack bookstore built around real commerce workflows, concurrency-safe inventory, private browser sessions, and a polished portfolio-grade storefront.**

**Live:** [bookbookhaven-free.onrender.com](https://bookbookhaven-free.onrender.com) · **Case study:** [Portfolio](https://abdulrahman-hajar-dev.netlify.app/work/bookhaven/) · **Engineer:** [Abdulrahman Hajar](https://github.com/rahman-997)

> The zero-cost deployment can use MongoDB Atlas M0 for durable data or an embedded ephemeral MongoDB for portfolio previews. Render is only a deployment profile; the application architecture is provider-neutral.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 |
| Backend | Express 5 · strict TypeScript · Zod 4 |
| Data | MongoDB · Mongoose 9 · indexes · adaptive transactions |
| Auth | JWT · bcrypt · HttpOnly cookie BFF · customer/admin RBAC |
| Commerce | Cart · wishlist · reviews · checkout · orders · inventory |
| Security | Helmet · rate limiting · explicit CORS · body limits · production env guards |
| Verification | Jest/Supertest · typecheck · production builds · GitHub Actions |
| Deployment | Docker Compose · Render Free · MongoDB Atlas M0 |

## Architecture

```text
Browser
  ↓
Next.js App Router
  ├─ public Server Components
  └─ same-origin BFF Route Handlers
       ↓ HttpOnly JWT → Authorization header
Express 5 API
  ↓ routes → middleware → controller → service → Mongoose
MongoDB
```

Business logic lives in services. Validation/authentication happens before controllers. Errors flow through a centralized `HttpError` handler. See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Product capabilities

### Storefront

- Responsive, mobile-first catalog
- Server-backed pagination, search, category filtering and sorting
- Book detail pages with dynamic canonical metadata, OpenGraph/Twitter metadata and JSON-LD
- Related-book recommendations
- Stock and low-stock visibility
- Persistent account cart and wishlist
- Reader reviews/ratings with paginated review reads
- Cash-on-delivery/manual checkout without a paid payment provider
- Order history plus protected order-detail pages
- Loading, empty, disabled, error and confirmation states
- Keyboard focus and reduced-motion support

### Admin

- Server-side RBAC on every admin API
- Create/edit/delete books
- Inventory and featured state management
- Searchable, paginated catalog operations
- Searchable/filterable/paginated order queue
- Guarded order-status transitions
- Book/user/order/review/low-stock counts
- Aggregate non-cancelled order value and recent orders

## Commerce reliability

BookHaven protects data integrity beyond normal CRUD:

- **Cart optimistic concurrency:** stale cart writes cannot silently overwrite newer state.
- **Checkout lock versioning:** a request that read an old cart cannot overwrite an active checkout lock.
- **Cross-user oversell protection:** stock decrements are conditional (`stock >= quantity`).
- **Duplicate checkout protection:** only one active checkout can own a cart lock.
- **Adaptive MongoDB transactions:** Atlas/replica-set deployments run checkout and cancellation atomically.
- **Standalone fallback:** local/ephemeral MongoDB uses compensation so partially decremented inventory is restored on failure.
- **Cancellation exactly once:** compare-and-set order transitions prevent double restocks.
- **Order snapshots:** historical orders keep title/unit-price values even if the catalog later changes.
- **Dependency cleanup:** deleting a book removes cart, wishlist and review references.

## API highlights

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/books
GET    /api/v1/books/slug/:slug
GET    /api/v1/books/:id
POST   /api/v1/books                    admin
PATCH  /api/v1/books/:id                admin
DELETE /api/v1/books/:id                admin

GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:bookId
DELETE /api/v1/cart/items/:bookId
DELETE /api/v1/cart

GET    /api/v1/wishlist
POST   /api/v1/wishlist/:bookId
DELETE /api/v1/wishlist/:bookId

GET    /api/v1/reviews/book/:bookId
PUT    /api/v1/reviews/book/:bookId
DELETE /api/v1/reviews/:id

GET    /api/v1/orders
POST   /api/v1/orders
GET    /api/v1/orders/:id
GET    /api/v1/orders/admin/all         admin
PATCH  /api/v1/orders/admin/:id/status  admin

GET    /api/v1/admin/stats              admin
GET    /api/v1/health
```

The complete OpenAPI 3.1 contract is [`docs/openapi.yaml`](./docs/openapi.yaml).

## Security model

- Passwords are hashed with bcrypt.
- JWTs are validated by Express on every protected request.
- Browser JavaScript does not receive the session JWT; Next.js stores it in an `HttpOnly`, `SameSite=Lax` cookie.
- Cookie max-age is derived from the actual JWT lifetime and `Secure` is enabled in production.
- Same-origin checks protect browser mutation BFF handlers.
- Auth endpoints and the API have rate limiting.
- Helmet and explicit security headers are enabled.
- Request bodies are bounded.
- CORS is explicit when credentials are used.
- Production startup rejects default/short JWT secrets, weak/default admin passwords, localhost Mongo URIs and wildcard credentialed CORS.
- Request IDs are emitted in responses and structured access logs.

## Local development

### Docker Compose

```bash
cp .env.example .env
```

Replace at least:

```env
JWT_SECRET=generate-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-unique-password
```

Then:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

### Separate processes

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

## Quality gate

Run the same production checks used for free hosting:

```bash
npm run build:free
```

That command performs, in order:

```text
backend install
→ backend typecheck
→ backend tests
→ backend production build
→ frontend install
→ frontend typecheck
→ frontend production build
```

A failing step prevents the build command from completing. GitHub Actions runs equivalent checks on both `push` and `pull_request`, with read-only repository permissions and concurrency cancellation.

## Testing coverage

The backend suite covers health, registration/login behavior, validation, authorization boundaries, catalog queries, cart locking, concurrent cart writes, wishlist, reviews, review pagination, checkout, duplicate checkout, cross-cart overselling, order ownership, state transitions, cancellation restock, admin query filtering, ISBN validation and delete cleanup.

## Free production profile

See [`FREE_HOSTING.md`](./FREE_HOSTING.md).

```text
GitHub
  ↓ auto deploy
Render Free Web Service
  ├─ Next.js public process
  └─ Express internal process on 127.0.0.1
  ↓
MongoDB Atlas M0
```

Render can be replaced by another Node.js host without changing browser/API/database architecture.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT lifetime, e.g. `7d` |
| `CORS_ORIGIN` | Explicit allowed frontend origin(s) |
| `ADMIN_EMAIL` | Seed/admin email |
| `ADMIN_PASSWORD` | Seed/admin password |
| `INTERNAL_API_URL` | Next.js → Express internal API URL |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL for metadata/sitemap |
| `AUTO_SEED` | Optional idempotent seed in combined hosting |
| `BACKEND_PORT` | Internal Express port in combined hosting |

Use `.env.example` as the template; never commit real credentials.

## Author

Built by **[Abdulrahman Hajar](https://github.com/rahman-997)** — Software Engineer and Full-Stack Developer in Istanbul, Türkiye.
