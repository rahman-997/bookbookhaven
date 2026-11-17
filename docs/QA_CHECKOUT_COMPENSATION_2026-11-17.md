# Checkout compensation regression — QA handoff (2026-11-17)

## Confirmed source defect
The standalone MongoDB checkout path had two failure-handling gaps in `backend/src/modules/orders/order.service.ts`:
1. `decrementInventory()` accumulated stock adjustments in a local array that was not returned if a later book decrement threw. As a result, the compensation caller could not identify earlier successful decrements.
2. `buildCheckoutItems()` ran outside `createWithCompensation()`'s `try/catch`, leaving the cart checkout lock held until timeout on preflight stock or unavailable-book errors.

## Changes on this branch
- Pass the rollback ledger to `decrementInventory()` and update it immediately after each successful decrement.
- Move preflight item validation into the protected `try/catch` so it restores/unlocks the cart after failed checkout.
- Add two targeted integration regression tests in `backend/tests/checkout-compensation.test.ts`:
  - Failed stock preflight releases the checkout lock and allows an immediate retry.
  - A simulated failure during the second conditional stock decrement restores the first book's inventory and retains the cart.

## QA evidence
- Source and test files were written to `fix/checkout-compensation-20261117` and fetched back from GitHub to verify the committed revisions.
- **Not run:** Jest/MongoDB tests, complete TypeScript typecheck, frontend build, npm dependency audit, security penetration tests or E2E. This execution environment cannot resolve GitHub/npm hosts and cannot obtain the missing dependencies/binaries.
- **Known limitation:** On standalone MongoDB, compensation is best-effort. A secondary database failure during rollback still requires incident handling/reconciliation; do not call the process fully atomic or production-certified.

## Before merging
```bash
npm ci --no-audit --no-fund --prefix backend
npm test --prefix backend -- --runTestsByPath tests/checkout-compensation.test.ts
npm run typecheck --prefix backend
npm test --prefix backend
npm run build --prefix backend
```
Use a disposable test MongoDB. Do not merge/deploy until all gates succeed. If opening a PR will trigger GitHub Actions, verify the account's free CI quota before doing so. No paid services are authorized.
