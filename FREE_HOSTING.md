# BookHaven — $0 deployment profile

BookHaven can run with no mandatory monthly hosting bill for a demo, portfolio, or small manually fulfilled store.

## Free stack

- **Source + CI:** GitHub Free + GitHub Actions
- **Web:** one Render Free Web Service
- **Database:** MongoDB Atlas M0 Free
- **TLS/subdomain:** Render-managed `*.onrender.com`
- **Local development:** Docker Compose + MongoDB container

## Repository deployment profile

```text
GitHub: https://github.com/rahman-997/bookbookhaven
Branch: main
Public URL: https://bookbookhaven-free.onrender.com
Health: https://bookbookhaven-free.onrender.com/api/health
```

`render.yaml` enables automatic deployment and uses:

```text
buildCommand: npm run build:free
startCommand: npm run start:free
healthCheckPath: /api/health
```

Do not manually trigger another deploy after a normal `main` push when Render auto-deploy is enabled; the push is already the deployment trigger.

## One-service architecture

The free profile intentionally keeps the architecture portable while consuming one Render service:

1. Next.js listens on public `$PORT`.
2. Express listens on `127.0.0.1:${BACKEND_PORT}` only.
3. Next.js calls Express through `INTERNAL_API_URL=http://127.0.0.1:3001/api/v1`.
4. Express connects to MongoDB through `MONGO_URI`.
5. Browser authentication stays in an HttpOnly cookie; Next.js BFF handlers translate it to a server-side Bearer header.

Render is not imported by application code and can be replaced by another Node.js host.

## MongoDB behavior

Atlas M0 uses a replica-set deployment, so BookHaven automatically uses MongoDB transactions for checkout and cancellation. Local standalone MongoDB is also supported: the service detects that transactions are unavailable and switches to its compensation path rather than failing startup or requiring replica-set configuration.

This keeps free/local development simple while giving Atlas stronger atomicity.

## Required secrets

Never commit these values:

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

Production env validation refuses default/short JWT secrets, weak/default admin passwords, localhost MongoDB URIs and wildcard credentialed CORS.

## Atlas M0

Create an M0 Free cluster and a dedicated database user. Use least-privilege credentials and a strong unique database password. Prefer restricted network access when practical.

URI shape:

```text
mongodb+srv://<user>:<password>@<cluster-host>/bookhaven?retryWrites=true&w=majority
```

## Quality gate

`npm run build:free` is the production gate:

```text
backend install
→ backend typecheck
→ backend tests
→ backend production build
→ frontend install
→ frontend typecheck
→ frontend production build
```

Any failing step stops the build command and therefore blocks deployment.

GitHub Actions executes equivalent checks on every push and pull request with read-only repository permission and workflow concurrency cancellation.

## Local verification

```bash
npm run typecheck
npm test
npm run build
```

Or run the complete free-hosting gate:

```bash
npm run build:free
```

## Free-tier tradeoffs

Render Free services may sleep while idle and cold-start on the next request. Atlas M0 has capacity limits. This profile is appropriate for a portfolio, demo, prototype, learning project, and small manually fulfilled workload—not an SLA-backed high-traffic shop.
