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


## Follow-up audit — 2026-11-18
- Found an additional correctness issue: `mongoTransactionsAvailable()` previously cached a single global capability boolean. Switching from a standalone MongoDB connection to a replica set in the same Node process could therefore choose the wrong checkout path.
- Replaced that cache with a `WeakMap` keyed to the active MongoDB database object. Transient detection failures are not cached, allowing later retries.
- Added `backend/tests/transaction-detection.test.ts`: standalone → replica-set capability refresh and transient discovery failure retry.
- Total new regression cases in the branch: **4** (2 checkout + 2 transaction detection). **All four still require execution with the project's Jest/TypeScript dependencies.**
- Reviewed the branch through GitHub after commits; `main` remains unchanged. No workflow was started.
- Scope warning: the MongoDB fallback remains best-effort, not genuinely transactional. Independent staged concurrency and recovery testing are required before commercial launch.


## Additional verification — 2026-11-18 (isolated, no database)
- TypeScript transpilation of the current `transactions.ts` module succeeded using an already installed local TypeScript compiler.
- A local Node.js VM executed the transpiled module with a mocked Mongoose connection; four direct assertions passed:
  1. No database connection returns false.
  2. Standalone MongoDB returns false and a successful discovery result is cached.
  3. Switching to a replica-set database object returns true.
  4. A transient discovery error is retried and a sharded topology is detected.
- Added two additional Jest regression cases for missing connection and cached sharded topology. The branch now contains **six new Jest test cases** (two checkout and four transaction detection); they are **not yet executed** against the actual installed project dependencies.
- Important: the isolated VM checks are **not MongoDB/Jest integration tests** and do not demonstrate TypeScript type correctness or production readiness.

## Follow-up hardening — 2026-11-18
- **Confirmed code-level risk:** a temporary `hello` topology discovery error previously returned `false`, silently selecting the best-effort non-transactional checkout path even when the database could actually support transactions.
- **Fix:** topology discovery now throws a generic error rather than downgrading. A later request may retry; no cart mutation should begin on the failed request.
- **Tests committed:** updated transient discovery test to require rejection, plus a new guard that checkout does not call `Cart.findOneAndUpdate` when discovery fails. **7 Jest cases** exist across the two added test files; they have **not been executed in a fully installed backend**.
- **Isolated execution:** TypeScript 5.8.3 transpiled the edited transaction capability module; a Node.js VM with mocked Mongoose ran **4/4 direct behavior scenarios successfully** (no DB, cached standalone detection, replica-set detection, retry after failed discovery). These are not actual MongoDB integration tests.
- **Still blocked:** complete `npm ci`, TypeScript project typecheck, Jest with MongoMemoryServer, full build and live environment checks. The current sandbox could not resolve `github.com` via Git.
- **Safety:** no changes on `main`, merge, public deployment, CI invocation, or paid services.
