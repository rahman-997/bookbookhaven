# BookHaven architecture

```text
Browser
  │
  │ HTTPS
  ▼
Next.js 16 App Router
  ├─ Server Components → public catalog/detail rendering
  ├─ Route Handlers/BFF → HttpOnly JWT cookie → Bearer token
  └─ Client UI → cart, wishlist, reviews, checkout, orders, admin
  │
  │ private/internal API
  ▼
Express 5 + TypeScript
  ├─ request id + structured access log
  ├─ Helmet + rate limiting + body limits + CORS
  ├─ Zod validation
  ├─ auth/RBAC
  ├─ controllers
  ├─ services
  └─ Mongoose models
  │
  ▼
MongoDB / MongoDB Atlas
```

## Modules

- `auth` — registration, login, current user, customer/admin roles
- `books` — catalog CRUD, search, filters, sorting, slug detail, active-order delete guard
- `cart` — persistent user cart with live stock checks and optimistic concurrency
- `wishlist` — persistent saved books
- `reviews` — one review per user/book with rating summary
- `orders` — zero-cost checkout, stock decrement, owned order detail, lifecycle transitions
- `admin` — operational metrics and recent order data
- `health` — service/database readiness

## Security boundaries

- Production Docker Compose does not expose MongoDB or Express to the host.
- In the free Render profile, Express listens only on `127.0.0.1`; Next.js is the public process.
- Browser authentication uses an HttpOnly, SameSite=Lax cookie managed by Next.js.
- State-changing BFF requests fail closed unless they have an explicitly trusted Origin or a same-origin Fetch Metadata signal.
- Express still validates the bearer JWT and role on every protected request.
- All mutating book/admin actions require `admin`.
- Zod validates bodies, query strings and route parameters before business logic.
- Helmet, request body limits and rate limiting are enabled.
- A request ID is returned as `x-request-id` and included in structured access logs.

## Cart and checkout consistency

Cart documents use Mongoose optimistic concurrency. Read-modify-save mutations retry bounded version conflicts, so concurrent additions and edits do not silently overwrite one another.

Checkout atomically acquires the cart lock and increments the same document version. Any cart request that started from an older version fails its save, reloads, sees the active checkout lock, and returns a conflict instead of overwriting checkout state.

Checkout then re-reads every cart book, validates current stock and price, decrements stock with conditional updates, and compensates already-decremented items if a later item fails. Duplicate checkout requests compete for the same cart lock, so only one can create the order.

## Order consistency

Order state transitions use compare-and-set updates. Cancellation restores inventory only after a valid `pending/confirmed → cancelled` transition; concurrent transition attempts cannot restore the same stock twice.

A book referenced by a `pending` or `confirmed` order cannot be deleted. This preserves the ability to cancel the order and restore inventory. Historical order line items retain title and unit-price snapshots so completed/cancelled history remains readable independently of later catalog changes.

## Database portability

Business logic depends on MongoDB/Mongoose, not on Render. Local Docker uses a normal MongoDB container and the free hosted profile can use Atlas M0. The combined Render launcher also supports a disposable embedded MongoDB fallback for portfolio demos when `MONGO_URI` is absent; that fallback is intentionally non-durable.

## Zero-cost checkout

The default product intentionally supports `cash_on_delivery` and `manual` settlement. There is no dependency on Stripe or another paid transaction provider. A provider can later be added behind the order service without changing cart/catalog APIs.
