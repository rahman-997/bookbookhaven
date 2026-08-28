# BookHaven — $0 deployment profile

BookHaven is designed to run with no mandatory monthly hosting bill for a portfolio, demo, prototype, or small manually fulfilled store.

## Free stack

- **Source + CI:** GitHub Free + GitHub Actions
- **Web:** one Render Free Web Service
- **Durable database:** MongoDB Atlas M0 Free
- **Demo database fallback:** embedded ephemeral MongoDB
- **TLS/subdomain:** Render-managed `*.onrender.com`
- **Local development:** Docker Compose + MongoDB

## Current production profile

```text
Repository: https://github.com/rahman-997/bookbookhaven
Branch: main
Public URL: https://bookbookhaven-free.onrender.com
Health: https://bookbookhaven-free.onrender.com/api/health
```

The Render service uses automatic deployment from `main`. A normal push already triggers deployment; do not manually trigger a second deploy when `autoDeploy` is enabled.

## One-service architecture

`npm run start:free` runs the application inside one Render service:

1. Next.js standalone runtime listens on public `$PORT`.
2. Express listens only on `127.0.0.1:${BACKEND_PORT}`.
3. Next.js reaches Express through `INTERNAL_API_URL`.
4. Express connects to MongoDB through `MONGO_URI` when configured.
5. The browser stores no API JWT in JavaScript-readable storage; the Next.js BFF translates an HttpOnly session cookie into the internal Bearer request.

The launcher mirrors the required Next.js `public` and static assets into the standalone runtime. Render is a deployment profile, not an application dependency.

## Database modes

### Atlas M0 — recommended durable mode

Set `MONGO_URI` to an Atlas M0 connection string. Users, carts, wishlists, reviews, orders and inventory then survive Render restarts and deployments.

Atlas uses a replica-set topology, so BookHaven automatically enables MongoDB transactions for checkout and cancellation. Cart lock acquisition, inventory updates, order creation and cart clearing are committed atomically. Cancellation restores inventory and changes status in the same transaction.

### Standalone/local MongoDB

A normal standalone MongoDB remains supported for simple local development. BookHaven detects that transactions are unavailable and automatically switches to the compensation implementation rather than failing startup or requiring a replica set.

### Ephemeral demo fallback

If `MONGO_URI` is absent or set to the setup sentinel used by the launcher, the free-hosting process can start an embedded MongoDB for a disposable portfolio preview. This mode is intentionally non-durable; data can reset after sleep, restart or redeploy.

If the embedded database cannot start, the launcher falls back to setup mode and `/api/health` reports that persistent configuration is required instead of pretending storage is durable.

## Required secrets for durable operation

Never commit:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Recommended non-secret production values:

```text
NODE_VERSION=24
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://bookbookhaven-free.onrender.com
INTERNAL_API_URL=http://127.0.0.1:3001/api/v1
BACKEND_PORT=3001
CORS_ORIGIN=https://bookbookhaven-free.onrender.com
JWT_EXPIRES_IN=7d
```

Production environment validation rejects default/short JWT secrets, weak/default admin passwords, localhost production MongoDB URIs and wildcard credentialed CORS.

## MongoDB Atlas M0

Create an M0 cluster and a dedicated database user with least-privilege credentials. Prefer restricted Network Access ranges when practical. If broad access is temporarily required for a dynamic free-hosting environment, use a strong unique database password and restrict the database user's permissions.

URI shape:

```text
mongodb+srv://<user>:<password>@<cluster-host>/bookhaven?retryWrites=true&w=majority
```

After `MONGO_URI` is added, the same application code uses Atlas automatically on the next deployment/restart.

## Quality gate

`npm run build:free` is the production build gate:

```text
backend install
→ backend typecheck
→ backend tests
→ backend production build
→ frontend install
→ frontend typecheck
→ frontend production build
```

Any failing command stops the build and blocks deployment. GitHub Actions executes equivalent checks on every push and pull request with read-only repository permission, concurrency cancellation, plus a standalone-runtime artifact check.

Local full verification:

```bash
npm run verify
```

Free-hosting gate:

```bash
npm run build:free
```

Start profile:

```bash
npm run start:free
```

## Free-tier tradeoffs

Render Free services may sleep while idle and cold-start on the next request. Atlas M0 has capacity limits. Embedded demo storage is disposable. This deployment profile is appropriate for a portfolio, demo, prototype, learning project, or small manually fulfilled workload—not an SLA-backed high-traffic production store.
