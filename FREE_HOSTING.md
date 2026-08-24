# BookHaven — $0 deployment profile

BookHaven is designed to run with no mandatory monthly hosting bill for a demo, portfolio, or small manually fulfilled store.

## Free stack

- **Git + source control:** GitHub Free
- **Verification:** Render Free build pipeline and GitHub Actions when enabled
- **Web:** one Render Free Web Service
- **Database:** MongoDB Atlas M0 Free
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

`npm run start:free` starts two processes inside one free web service when MongoDB is configured:

1. Next.js listens on public `$PORT`.
2. Express listens on `127.0.0.1:3001` only.
3. Next.js calls Express through `INTERNAL_API_URL=http://127.0.0.1:3001/api/v1`.
4. Express connects to MongoDB Atlas through `MONGO_URI`.

The browser never needs the internal Express hostname or JWT. Authentication is translated by the Next.js BFF from an HttpOnly cookie to a Bearer token.

## Safe setup mode

If `MONGO_URI` is missing or equals `PENDING_ATLAS`, `npm run start:free` deliberately starts a small setup page instead of crashing. `/api/health` reports `setup-required` while the database is unconfigured.

After an Atlas M0 URI is added to Render, redeploy the same service. The normal Next.js + Express runtime starts automatically.

## Required secrets

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

Keep `AUTO_SEED=false` until Atlas and the intended admin credentials are configured. Then it can be enabled for the idempotent demo seed.

## MongoDB Atlas M0

Create an M0 Free cluster and a dedicated database user. Prefer Render outbound ranges in Atlas Network Access when available. If `0.0.0.0/0` is temporarily necessary, use a strong unique database password and least-privilege database credentials.

Example URI shape:

```text
mongodb+srv://<user>:<password>@<cluster-host>/bookhaven?retryWrites=true&w=majority
```

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

Free web services may sleep while idle and cold-start on the next request. Atlas M0 has storage and performance limits. This profile is suitable for demos, learning, portfolios, prototypes, and early/small stores rather than an SLA-backed high-traffic production shop.
