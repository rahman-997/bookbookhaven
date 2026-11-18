# BookHaven — PR #79 recovery-read reconciliation
Date: 2026-11-18

## Baseline
Based on the existing green **Draft PR #79** (`fix/not-found-query-leak-20261116`), head `74161114332b52a4d2ffbceb25b5a834eeb9cb59`.
Exact-head GitHub CI **success**: https://github.com/rahman-997/bookbookhaven/actions/runs/43963842774
Exact-head security scan **success**: https://github.com/rahman-997/bookbookhaven/actions/runs/43963842759
These passing results apply to PR #79's head **before** this follow-up patch, not to this branch.

## Verified omission
A previous source branch (`fix/bookhaven-mongo-ci-prewarm-20261104`) protected cart items when the recovery product-existence read failed transiently, but PR #79's `backend/src/modules/orders/order.service.ts` had reverted to `.catch(() => [])` and filtered all cart items away.
A transient MongoDB outage could therefore silently clear the user's cart during an already-failed checkout.

## Scope of this branch
- Reintroduce the previously implemented recovery logic: retain `originalCartItems` when the product-existence lookup throws, but still filter removed products if the lookup succeeds.
- Reintroduce its existing regression test into `backend/tests/api.test.ts`.
- Both changes copied from the earlier repository branch and reviewed against current PR #79 source; this is *not* a reimplementation of checkout inventory ledger fixes already covered by PR #79.
- Diff against PR #79 source branch: exactly two files.

## QA status
- **PASS:** GitHub source comparison proves changed files are limited to the order service and API test.
- **PASS:** Confirmed test and corrected source are present on the branch.
- **NOT RUN:** newly added test with real MongoDB, full Jest suite, TypeScript checks, builds and security scanners against this branch. No local npm registry/network access to download project dependencies.
- **NOT CLAIMED:** production certification or complete transactional guarantees for standalone MongoDB.

## Next checks (disposable local environment, no paid services)
1. `npm ci --prefix backend --no-audit --no-fund` (Node 24 as pinned).
2. `npm run typecheck --prefix backend`.
3. `npm test --prefix backend -- --runInBand` with the project test Mongo fixture available.
4. `npm run build --prefix backend && npm run build --prefix frontend`.
5. Repeat runtime dependency audits and verify source security scan before considering PR changes.
6. Reconcile independently reviewed MongoDB topology change from `fix/checkout-compensation-20261117` **only after** this regression passes.

No main merge, production change, public deployment, payment or new GitHub Actions invocation occurred.
