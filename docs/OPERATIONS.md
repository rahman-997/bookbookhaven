# BookHaven Operations

This document is the operational source of truth for the BookHaven portfolio deployment.

## Production invariants

- Production source branch: `main`.
- Render uses `npm run build:free` and `npm run start:free`.
- Node is pinned to `24.20.0` in repository/runtime configuration.
- Backend and frontend dependencies are installed from committed lockfiles with `npm ci`.
- CI and Render builds fail on high/critical runtime dependency audit findings.
- Every production candidate must pass Compose validation, backend typecheck/tests/build, frontend typecheck/build, standalone-runtime verification, and the full free-hosting runtime smoke flow.
- Docker Node and Mongo images are pinned by digest to prevent silent image drift.
- Dependabot tracks npm, GitHub Actions, Docker, and Docker Compose while avoiding unreviewed runtime-major jumps.

## Full-stack runtime smoke gate

CI runs `npm run smoke:free` after the production backend and Next.js standalone build has completed. The smoke harness boots the same free-hosting launcher used by Render with an isolated embedded MongoDB instance and seeded demo data, then exercises the application through the public Next.js surface.

The gate verifies:

- frontend and backend readiness through `/api/health`
- explicit ephemeral/non-durable storage reporting for the isolated smoke database
- homepage rendering
- catalog and catalog-facet API reads
- robots and sitemap generation
- same-origin registration through the Next.js BFF
- session-cookie propagation into authenticated backend requests
- persistent cart creation
- checkout/order creation through the standalone MongoDB compensation path
- cart clearing after checkout
- order-history and order-detail retrieval
- exactly-once inventory decrement for the purchased book

This is deliberately stronger than checking that `frontend/.next/standalone/server.js` merely exists: it validates that the built application can actually boot and complete a critical commerce flow.

## Health, readiness and storage durability

Public full-stack readiness endpoint:

```text
GET /api/health
```

The Next.js health route proxies the backend readiness probe and returns HTTP 503 when the backend cannot prove that MongoDB is responding. Health responses are explicitly `Cache-Control: no-store` so deploy and monitoring checks cannot succeed from stale intermediary data.

Backend probes:

```text
GET /api/v1/health/live
GET /api/v1/health/ready
GET /api/v1/health
```

`/health/live` is process liveness. It returns HTTP 200 while the API process is running, including while graceful shutdown is draining traffic.

`/health/ready` is traffic readiness. It performs an actual MongoDB `ping` with a bounded timeout and returns HTTP 503 when the database is unavailable or graceful shutdown has begun. `/health` remains a compatibility alias for the same readiness behavior.

The readiness payload exposes only non-secret operational state:

- `database`: `up` or `down`
- `storageMode`: `external`, `ephemeral`, or `unknown`
- `durable`: `true` only when an external MongoDB connection is configured
- `shuttingDown`: `true` once the runtime has started draining requests
- `uptime`: backend process uptime in seconds

No MongoDB URI, credentials, hostnames, or secrets are returned by health diagnostics.

### Graceful shutdown

On `SIGTERM` or `SIGINT`, the backend immediately marks itself not-ready before closing the HTTP listener. Idle connections are closed, in-flight work is given time to finish, and MongoDB is disconnected before normal process exit. An 8-second hard deadline prevents a stuck keep-alive or dependency from hanging shutdown indefinitely; after that deadline remaining HTTP connections are force-closed and the process exits unsuccessfully.

Repeated shutdown signals are idempotent and do not start overlapping drain sequences.

### External/durable mode

When `MONGO_URI` is configured, the free-hosting launcher marks the runtime as `external`. This is the intended production mode. MongoDB Atlas M0 or any compatible MongoDB deployment can be used; the application is not coupled to Render.

Expected health state:

```json
{
  "database": "up",
  "storageMode": "external",
  "durable": true,
  "shuttingDown": false
}
```

### Ephemeral demo mode

If `MONGO_URI` is absent, the Render-compatible launcher starts an embedded MongoDB process so the portfolio remains demonstrable without a paid database. This mode is intentionally reported as non-durable.

Expected health state:

```json
{
  "database": "up",
  "storageMode": "ephemeral",
  "durable": false,
  "shuttingDown": false
}
```

Data in ephemeral mode can be lost on sleep, restart, instance replacement, or redeployment. `AUTO_SEED` may repopulate the demo catalog but is not a persistence mechanism.

## Enabling durable MongoDB

1. Create or select a MongoDB deployment.
2. Create a least-privilege database user for BookHaven.
3. Allow network access from the hosting environment according to the database provider's controls.
4. Set the complete connection string as the hosting secret `MONGO_URI`.
5. Redeploy.
6. Verify `/api/health` returns HTTP 200 with `storageMode: external` and `durable: true`.
7. Exercise registration, catalog read, cart, checkout, and order retrieval once after cutover.

Never commit `MONGO_URI` or database credentials to GitHub.

## Dependency policy

- npm: minor/patch maintenance is grouped; majors require an explicit compatibility phase.
- GitHub Actions: majors require explicit review.
- Node Docker images: runtime majors require explicit review.
- Mongo Compose image: remain on the selected MongoDB 8.0 release line until a deliberate database-upgrade phase is performed.

Digest updates within an approved release line should still pass the full CI gate before merge.

## Repository protection

CI is configured for both pushes and pull requests. Repository-level branch protection/rulesets are account settings rather than application code. The repository should require the `CI / verify` check and security-scanner checks on `main` and disallow force pushes/deletion where the GitHub plan/settings permit it.

The connected automation used during this project can read repository protection state but is not authorized to change branch-protection settings. Do not treat the presence of CI alone as proof that repository-level enforcement is enabled.

## Release checklist

Before declaring a revision production-ready:

1. Branch CI succeeds, including `smoke:free`.
2. Pull-request CI succeeds.
3. CodeQL and Semgrep succeed on the pull request.
4. Squash merge to `main`.
5. Post-merge CI and security scanners succeed.
6. Render deploy for the exact merge commit reaches `live`.
7. Public `/api/health` returns HTTP 200 and `shuttingDown: false`.
8. Public catalog/facet endpoints return expected data.
9. For durable production, health must additionally report `storageMode: external` and `durable: true`.
