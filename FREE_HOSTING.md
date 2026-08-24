# BookHaven — $0 deployment profile

The repository is designed to run with no mandatory monthly hosting bill for a demo/small project.

## Stack

- **Git + CI:** GitHub Free / GitHub Actions allowance
- **Web:** one Render Free Web Service
- **Database:** MongoDB Atlas M0 Free
- **TLS + subdomain:** Render-managed `*.onrender.com`
- **Local:** Docker Compose + MongoDB container

## Why one Render service?

`npm run start:free` starts two processes inside one free service:

1. Next.js listens on public `$PORT`.
2. Express listens on `127.0.0.1:3001` only.
3. Next.js calls Express at `INTERNAL_API_URL=http://127.0.0.1:3001/api/v1`.
4. Express connects to Atlas using `MONGO_URI`.

This preserves the full-stack separation while avoiding a second hosting service.

## Required Render secrets

Never commit these values:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Optional/public values:

- `NEXT_PUBLIC_SITE_URL=https://<your-service>.onrender.com`
- `AUTO_SEED=true`
- `NODE_VERSION=24`

## MongoDB Atlas

Use an M0 Free cluster and a dedicated DB user with read/write access only to the BookHaven database. Prefer Render outbound ranges in Atlas Network Access when available; `0.0.0.0/0` should only be a temporary fallback with a strong unique password.

Example URI shape:

```text
mongodb+srv://<user>:<password>@<cluster-host>/bookhaven?retryWrites=true&w=majority
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

Free web services can sleep when idle and cold-start on the next request. Atlas M0 has storage/performance limits. This profile is intended for demos, learning, portfolios and early/small deployments, not an SLA-backed high-traffic store.
