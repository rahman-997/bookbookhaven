# BookHaven architecture

```text
Browser
  │ HTTPS
  ▼
Next.js 16 App Router
  ├─ Server Components → catalog, book detail, metadata, sitemap
  ├─ Route Handlers/BFF → HttpOnly JWT cookie → Bearer token
  └─ Client UI → account, cart, wishlist, reviews, checkout, orders, admin
  │ private/internal HTTP
  ▼
Express 5 + strict TypeScript
  ├─ request ID + structured access logging
  ├─ Helmet + rate limiting + request-size limits + explicit CORS
  ├─ Zod 4 validation
  ├─ authentication + customer/admin RBAC
  ├─ controllers
  ├─ services (business logic)
  └─ Mongoose models/indexes
  │
  ▼
MongoDB
  ├─ Atlas / replica set / sharded → transactions
  └─ standalone / local → compensation fallback
```

## Request lifecycle

```text
route → validation/auth middleware → controller → service → model/database
                                           │
                                           └─ throws HttpError
                                                  ↓
                                      centralized error handler
```

Controllers are transport adapters. Business rules live in services; controllers do not emit generic manual `500` responses.

## Modules

- `auth` — registration, login, current user, JWT sessions, customer/admin roles.
- `books` — CRUD, paginated search/filter/sort, slug lookup, validated ISBN-10/13, stock, featured state and active-order delete guard.
- `cart` — persistent MongoDB cart, stock validation, optimistic concurrency and checkout locking.
- `wishlist` — persistent saved books with duplicate prevention and delete cleanup.
- `reviews` — one review per user/book, paginated reads, rating average/count and owner/admin deletion rules.
- `orders` — paginated history/detail, checkout, inventory decrement, lifecycle transitions and cancellation restock.
- `admin` — protected metrics, paginated/searchable catalog operations and paginated/searchable fulfillment queue.
- `health` — service/database readiness.

## Authentication and browser boundary

The browser never needs direct access to the API JWT. Next.js login/register route handlers store the token in an `HttpOnly`, `SameSite=Lax` cookie with a TTL derived from the JWT lifetime. Browser mutations pass through same-origin Next.js BFF handlers, which forward the JWT server-side. Express validates authentication and role again on every protected request.

State-changing BFF requests fail closed unless the request has an explicitly trusted Origin or a same-origin Fetch Metadata signal.

## Cart concurrency

Cart documents use Mongoose optimistic concurrency. Read-modify-save mutations retry bounded version conflicts rather than silently overwriting newer state.

Checkout atomically acquires a cart lock and increments the document version. A cart request that read an older version therefore cannot overwrite an active checkout lock.

## Checkout atomicity

Checkout always re-reads books, current prices and current stock, then decrements inventory with a `stock >= quantity` predicate so separate customers cannot oversell the same item.

### Transaction-capable MongoDB

When MongoDB reports a replica set or sharded deployment, BookHaven uses a Mongoose transaction for:

1. cart lock acquisition,
2. inventory decrement,
3. order creation,
4. cart clear/unlock.

Cancellation likewise changes the order state and restores inventory inside one transaction.

### Standalone/local MongoDB

Standalone MongoDB remains supported. The service automatically uses a compensation path instead of requiring replica-set configuration. If checkout fails after partial inventory updates, successfully decremented stock is restored, a partial order is removed, surviving cart references are restored, and the checkout lock is released. Cancellation compensates partial inventory restoration and rolls the status back when restoration cannot complete.

## Order state machine

```text
pending → confirmed → shipped → completed
   └──────────────┐
confirmed ────────┴→ cancelled
```

Transitions use compare-and-set updates, preventing concurrent requests from applying the same transition twice. Books referenced by `pending` or `confirmed` orders cannot be deleted so cancellation can still restore inventory. Order line items preserve title and unit-price snapshots for historical readability.

## Data and query scaling

- Books use bounded pagination plus text, author, category, featured and price filters.
- ISBN values are normalized and checksum-validated before persistence; slug and ISBN are unique.
- Reviews are paginated while aggregate rating metadata is computed separately.
- Customer/admin order lists use validated bounded pagination; admin search is escaped and bounded.
- Admin catalog and order screens fetch server-side pages rather than entire collections.
- MongoDB indexes cover unique identifiers, text search, author/price/featured lookup and category/featured recency.

## SEO and rendering

Book pages expose dynamic metadata, canonical URLs, OpenGraph/Twitter fields and Schema.org `Book` structured data with offer/aggregate-rating information where available. The sitemap iterates through paginated catalog data rather than stopping at the first page.

## Deployment portability

Application code depends on Node.js, MongoDB and environment variables—not Render. Local Docker uses MongoDB directly. The free hosted profile can use Atlas M0 for durable storage or a disposable embedded MongoDB fallback for portfolio previews. Next.js uses standalone output on Render, while Express remains private on `127.0.0.1` in the combined one-service profile.

## Zero-cost checkout

The default product supports `cash_on_delivery` and `manual` settlement, so no paid payment provider is required. A future provider can be introduced behind the order service without redesigning cart/catalog APIs.
