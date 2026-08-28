# BookHaven — $0 deployment profile

BookHaven is designed to run with no mandatory monthly hosting bill for a demo, portfolio, or small manually fulfilled store.

## Free stack

- **Git + source control:** GitHub Free
- **Verification:** GitHub Actions and the Render production build gate
- **Web:** one Render Free Web Service
- **Durable database:** MongoDB Atlas M0 Free
- **Demo fallback:** embedded ephemeral MongoDB when Atlas is not configured
- **TLS + subdomain:** Render-managed `*.onrender.com`
- **Local development:** Docker Compose + MongoDB container

## Current Render service

The repository is configured for:

```text
https://bookbookhaven-free.onrender.com
```

The service tracks `main` from:

```text
https://github.com/rahman-997/bookbookhaven
```

## Why one Render service?

`npm run start:free` starts two application processes inside one free web service:

1. Next.js listens on public `$PORT`.
2. Express listens on `127.0.0.1:3001` only.
3. Next.js calls Express through `INTERNAL_API_URL=http://127.0.0.1:3001/api/v1`.
4. Express connects to `MONGO_URI` when a durable MongoDB deployment is configured.

The browser never needs the internal Express hostname or JWT. Authentication is translated by the Next.js BFF from an HttpOnly cookie to a Bearer token.

## Database modes

### Durable mode — recommended

Set `MONGO_URI` to a MongoDB Atlas M0 connection string. Cart, wishlist, reviews, users, orders, inventory, and admin data then survive Render restarts and redeployments.

This is the intended production/portfolio configuration.

### Ephemeral demo fallback

If `MONGO_URI` is missing or equals `PENDING_ATLAS`, the current combined hosting launcher attempts to start `mongodb-memory-server` so the public portfolio demo remains usable without a paid database or external secret.

This mode is deliberately **not durable**. Data can reset when the Render instance restarts, sleeps, or redeploys. It is suitable only for a disposable demo.

If the embedded MongoDB process cannot start, the launcher falls back to a small setup page. `/api/health` then reports `setup-required` instead of pretending that persistent storage is available.

## Required secrets for durable operation

Never commit these values:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Recommended public/runtime values:

```text
NODE_VERSION=24
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://bookbookhaven-free.onrender.com
INTERNAL_API_URL=http://127.0.0.1:3001/api/v1
BACKEND_PORT=3001
CORS_ORIGIN=https://bookbookhaven-free.onrender.com
```

`AUTO_SEED=true` is useful for the disposable portfolio demo because it restores idempotent sample data after an ephemeral reset. For a real persistent catalog, choose the seed policy intentionally and avoid using demo credentials.

## MongoDB Atlas M0

Create an M0 Free cluster and a dedicated database user. Prefer Render outbound ranges in Atlas Network Access when available. If `0.0.0.0/0` is temporarily necessary, use a strong unique database password and least-privilege database credentials.

Example URI shape:

```text
mongodb+srv://<user>:<password>@<cluster-host>/bookhaven?retryWrites=true&w=majority
```

After `MONGO_URI` is added to Render, the same code automatically uses Atlas on the next deploy/restart; Render is not part of the data model or business logic.

## Quality gate

The production Render build is intentionally strict. `npm run build:free` performs:

```text
backend install
→ backend typecheck
→ backend tests
→ backend production build
→ frontend install
→ frontend typecheck
→ Next.js production build
```

Any failure stops deployment.

You can run the same project-level verification locally with:

```bash
npm run verify
```

## Render commands

Build:

```bash
npm run build:free
```

Start:

```bash
npm run start:free
```

Health:

```text
/api/health
```

## Free-tier tradeoffs

Free web services may sleep while idle and cold-start on the next request. Atlas M0 has storage and performance limits. The embedded fallback loses data on restart. This profile is suitable for demos, learning, portfolios, prototypes, and early/small stores rather than an SLA-backed high-traffic production shop.
