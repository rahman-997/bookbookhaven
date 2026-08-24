# BookHaven architecture

```text
Browser
  │
  │ HTTPS
  ▼
Next.js 16 App Router
  ├─ Server Components → public catalog/detail rendering
  ├─ Route Handlers/BFF → HttpOnly JWT cookie → Bearer token
  └─ Client UI → cart, wishlist, reviews, checkout, admin
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
- `books` — catalog CRUD, search, filters, sorting, slug detail
- `cart` — persistent user cart with live stock checks
- `wishlist` — persistent saved books
- `reviews` — one review per user/book with rating summary
- `orders` — zero-cost checkout, stock reservation/decrement, order lifecycle
- `admin` — operational metrics and recent order data
- `health` — service/database readiness

## Security boundaries

- Production Docker Compose does not expose MongoDB or Express to the host.
- In the free Render profile, Express listens only on `127.0.0.1`; Next.js is the public process.
- Browser authentication uses an HttpOnly, SameSite=Lax cookie managed by Next.js.
- Express still validates the bearer JWT and role on every protected request.
- All mutating book/admin actions require `admin`.
- Zod validates bodies, query strings and route parameters before business logic.
- Helmet, request body limits and rate limiting are enabled.
- A request ID is returned as `x-request-id` and included in structured access logs.

## Order consistency

Checkout re-reads every cart book, validates current stock and price, decrements stock with conditional updates, and rolls back already-decremented items if a later item fails. Cancelling an active order returns inventory. This gives good behavior without requiring a paid queue or external transaction service.

## Zero-cost checkout

The default product intentionally supports `cash_on_delivery` and `manual` settlement. There is no dependency on Stripe or another paid transaction provider. A provider can later be added behind the order service without changing cart/catalog APIs.
