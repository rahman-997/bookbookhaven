# BookHaven v4 — protect cart state during checkout recovery

Date: 2026-11-18
Base: Draft PR #79, `fix/not-found-query-leak-20261116`; its latest verified head `5143927ae0b5c5279feccd6ac934e4e20583a552` passed [CI](https://github.com/rahman-997/bookbookhaven/actions/runs/44271908232) and [Security scanners](https://github.com/rahman-997/bookbookhaven/actions/runs/44271908270).

## Remaining defect
After an already failed standalone-MongoDB checkout, the cleanup query used `Book.find(...).lean().catch(() => [])`. A transient database read error would be interpreted as no surviving books, silently emptying the customer's existing cart.

## Fix and regression
- Preserve the original cart as the fallback if the recovery read fails.
- When the read succeeds, retain the previous removal of genuinely deleted books.
- Port the previously written regression from the repository's `fix/bookhaven-mongo-ci-prewarm-20261104` branch into `backend/tests/api.test.ts`.
- Compare against the current PR #79 branch: **2 commits ahead, 0 behind**, only the order-service code and an API test were changed.

## Verification boundary
- PASS: GitHub round-trip source check and exact baseline comparison.
- NOT RUN: changed Jest/MongoDB test, full typecheck, frontend/backend builds and new security scans. Do not claim the CI-green baseline proves this branch is green.
- Do not merge into PR #79 without new integration QA and review. No live orders, purchases, account data changes, paid CI, main changes or production deployment.
