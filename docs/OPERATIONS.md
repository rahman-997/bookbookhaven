# BookHaven Operations

This document is the operational source of truth for the BookHaven portfolio deployment.

## Production invariants

- Production source branch: `main`.
- Render uses `npm run build:free` and `npm run start:free`.
- Node is pinned to `24.20.0` in repository/runtime configuration.
- Backend and frontend dependencies are installed from committed lockfiles with `npm ci`.
- CI and Render builds fail on high/critical runtime dependency audit findings.
- Every production candidate must pass Compose validation, backend typecheck/tests/build, frontend typecheck/build, and standalone-runtime verification.
- Docker Node and Mongo images are pinned by digest to prevent silent image drift.
- Dependabot tracks npm, GitHub Actions, Docker, and Docker Compose while avoiding unreviewed runtime-major jumps.

## Health and storage durability

Public health endpoint:

```text
GET /api/health
```

The backend health payload exposes only non-secret operational state:

- `database`: `up` or `down`
- `storageMode`: `external`, `ephemeral`, or `unknown`
- `durable`: `true` only when an external MongoDB connection is configured
- `uptime`: backend process uptime in seconds

No MongoDB URI, credentials, hostnames, or secrets are returned by health diagnostics.

### External/durable mode

When `MONGO_URI` is configured, the free-hosting launcher marks the runtime as `external`. This is the intended production mode. MongoDB Atlas M0 or any compatible MongoDB deployment can be used; the application is not coupled to Render.

Expected health state:

```json
{
  "database": "up",
  "storageMode": "external",
  "durable": true
}
```

### Ephemeral demo mode

If `MONGO_URI` is absent, the Render-compatible launcher starts an embedded MongoDB process so the portfolio remains demonstrable without a paid database. This mode is intentionally reported as non-durable.

Expected health state:

```json
{
  "database": "up",
  "storageMode": "ephemeral",
  "durable": false
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

CI is configured for both pushes and pull requests. Repository-level branch protection/rulesets are account settings rather than application code. The repository should require the `CI / verify` check on `main` and disallow force pushes/deletion where the GitHub plan/settings permit it.

The connected automation used during this project can read repository protection state but is not authorized to change branch-protection settings. Do not treat the presence of CI alone as proof that repository-level enforcement is enabled.

## Release checklist

Before declaring a revision production-ready:

1. Branch CI succeeds.
2. Pull-request CI succeeds.
3. Squash merge to `main`.
4. Post-merge CI succeeds.
5. Render deploy for the exact merge commit reaches `live`.
6. Render logs confirm the pinned Node runtime and successful build gate.
7. Public `/api/health` returns HTTP 200.
8. For durable production, health must additionally report `storageMode: external` and `durable: true`.
