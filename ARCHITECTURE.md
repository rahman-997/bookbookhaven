# BookHaven architecture

```text
Browser
  │ HTTPS
  ▼
Next.js 16 App Router
  ├─ Server Components → catalog, detail, SEO metadata, sitemap
  ├─ Route Handlers/BFF → HttpOnly JWT cookie → Bearer token
  └─ Client UI → account, cart, wishlist, reviews, checkout, orders, admin
  │ private/internal HTTP
  ▼
Express 5 + strict TypeScript
  ├─ request ID + structured access log
  ├─ Helmet + rate limits + body limits + explicit CORS
  ├─ Zod 4 validation
  ├─ authentication + customer/admin RBAC
  ├─ controllers
  ├─ services (business logic)
  └─ Mongoose models/indexes
  │
  ▼
MongoDB
  ├─ Atlas/replica set → transactions enabled automatically
  └─ standalone/local → safe compensation fallback
```

## Service boundaries

- `auth` — registration, login, current user and roles.
- `books` — CRUD, slug/ISBN uniqueness, normalized ISBN validation, pagination, search/filter/sort and stock.
- `cart` — persistent user cart, live stock checks, checkout locking and optimistic concurrency retries.
- `wishlist` — persistent saved books with duplicate prevention.
- `reviews` — one review per user/book, rating aggregates and paginated reads.
- `orders` — checkout, inventory decrement, order history/detail, guarded state transitions and cancellation restock.
- `admin` — protected metrics plus searchable/paginated catalog and fulfillment workflows.
- `health` — service/database readiness.

## Request lifecycle

```text
route → validation/auth middleware → controller → service → model/database
                                           │
                                           └─ throws HttpError
                                                  ↓
                                      centralized error handler
```

Controllers are transport adapters. Business rules belong in services; controllers do not emit generic manual 500 responses.

## Authentication and browser boundary

The browser never needs direct access to the API JWT. Login/register route handlers receive the API session, store its token in an `HttpOnly`, `SameSite=Lax` cookie with a TTL derived from the JWT lifetime, and return only safe user data. Browser mutations go through same-origin Next.js BFF handlers, which forward the token server-side. Express validates the JWT and role again on every protected request.

## Commerce consistency

### Cart

Mongoose optimistic concurrency prevents stale read→modify→save writes from silently overwriting newer cart state. Retryable version conflicts are retried a bounded number of times. Checkout acquisition atomically timestamps the lock and increments the document version, so a cart request that read an older document cannot overwrite an active checkout lock.

### Checkout

1. Atomically acquire the cart checkout lock.
2. Re-read every book and current price/stock.
3. Decrement stock using `stock >= requestedQuantity` predicates, preventing overselling across different users.
4. Create the order from immutable title/price snapshots.
5. Clear/unlock the cart.

When the MongoDB deployment supports transactions (Atlas replica set or sharded cluster), the entire checkout runs inside a Mongoose transaction. Standalone/local MongoDB automatically uses the compensation path: any successfully decremented inventory is restored if a later step fails, the partial order is removed, and the cart is restored/unlocked.

### Order state machine

```text
pending → confirmed → shipped → completed
   └──────────────┐
confirmed ────────┴→ cancelled
```

Cancellation uses compare-and-set status updates, so inventory restoration happens once even under concurrent requests. Transaction-capable MongoDB restores inventory and changes status atomically; the standalone fallback compensates partial restores and rolls the order state back on failure.

## Security boundaries

- Render combined hosting keeps Express on `127.0.0.1`; Next.js is public.
- Docker Compose keeps MongoDB and Express off the public host network by default.
- Helmet, explicit credentialed CORS, request size limits and rate limiting are enabled.
- Production env validation rejects weak/default secrets, weak admin passwords, localhost production Mongo URIs and wildcard credentialed CORS.
- Zod validates bodies, query strings and path parameters.
- Admin APIs enforce RBAC server-side; the admin UI is not a security boundary.
- Request IDs are returned as `x-request-id` and included in structured access logs.

## Scaling characteristics

Catalog, review and admin order surfaces use bounded pagination. Relevant MongoDB indexes cover unique identifiers, text search, author/price/featured lookup and category/featured recency. Public book pages use dynamic metadata, canonical URLs, JSON-LD and a paginated sitemap. The architecture remains provider-neutral: Render is a deployment profile, not a runtime dependency.
