# Kiokudo Phase 02/05 — FSRS outbox (2026-10-10)

**Status: PARTIAL / NO-GO.** This run created an isolated, typed review outbox domain and unit tests on a dedicated Web branch, but did not activate browser writes or production. **Earned: 2/10 provisional points**, strictly for local-tested event identity/retry/ack state-machine logic. IndexedDB persistence, authenticated BFF, browser E2E, Core integration and server-side undo remain unverified or blocked. Do not interpret 2/10 as production-readiness.

## Immutable starting point
- Web main HEAD before: `bbed3870a48cf0e61e0d251fe6035fc6551655c2`.
- Core main HEAD before: `67682872d78f37559e4c9e9d109c5c8320d418c1`.
- Phase 01 report: `agent/kiokudo-p01-bff-query-guard-20261010/docs/automation/reports/PHASE_01_REPORT.md`, P01 = PARTIAL 2/10, AUTH-03/04 BLOCKED.
- Legacy pinned source: `3348f4ee49c9539fb9ea60c96e42833811c325ca`.
- Web working branch: `agent/kiokudo-p02-outbox-20261010`; changes remain **unmerged**.

## Source observations
- `src/app/review/page.tsx` lines 344–355: `handleGrade` remains a no-op with a preview notice; no review event is enqueued by this page. Undo UI history is currently empty and cannot undo a persisted Core review.
- `src/app/api/backend/[...path]/route.ts`: BFF is read-only, local preview gated; all non-GET requests return 405.
- `src/lib/offline-db.ts`: legacy Dexie `JapaneseSrsOfflineDB` still contains `pendingReviews` and `syncPendingReviewsToServer('/api/review')` with legacy wire shape. **Do not call this from the new Web**; it does not implement the trusted principal and canonical Core ack contract.
- Core `POST /api/v1/reviews` and `POST /api/v1/reviews/batch` accept `eventId`, `cardId`, `rating`, `reviewedAt`; Core transaction code performs event ID dedupe, conflict rejection, sorting and atomic update/log. This is a source audit, not a new integration test in this run.
- Core has service bearer but no authenticated learner principal/owner column, so browser writes remain blocked by Phase 01 gate.

## Changes actually committed
1. `src/lib/fsrs-review-outbox.ts` — immutable event identity, validated canonical ack, explicit states pending/in_flight/uncertain/blocked_auth/rejected/acknowledged, exponential retry delay, sequential chronological replay, injected transport (no default HTTP), atomic-store contract for claim/settle/cancel.
2. `tests/fsrs-review-outbox.test.ts` — 10 tests for invalid input, owner cache scope, duplicate ID, canonical ack, lost response, auth/conflict errors, malformed success, restart-like shared memory, ordering, unsent-only cancel and stale lease tokens.

**Important limitation:** A Dexie `IndexedDbReviewOutbox` adapter was developed and locally reviewed, but its GitHub file creation was rejected by the connector's safety checks. The adapter is **NOT committed** and browser IndexedDB persistence has **NOT been tested**. The new pure module is not imported by the Review UI, so the existing write-disabled behavior remains unchanged.

## Tests executed locally
Environment: Node v22.16.0; global TypeScript v5.8.3. Public GitHub DNS resolution failed for local git clone and npm dependency installation; no complete repository checkout or installed dependencies were available.

- `node --experimental-strip-types --test tests/fsrs-review-outbox.local.test.ts` on the local equivalent tests with a temporary `.ts` import path: **10/10 PASS, 0 failed**.
- `tsc --noEmit --strict --target ES2017 --lib esnext,dom --module esnext --moduleResolution bundler src/lib/fsrs-review-outbox.ts`: **PASS**.
- Full Web `npm test`, `npm run check`, `npm run build`: **NOT_EXECUTED** (no installed project dependencies).
- Core `npm test`, `npm run build`, Python tests: **NOT_EXECUTED**.
- Browser IndexedDB, cross-tab Dexie transaction, Web→BFF→Core, auth/tenant isolation, UI visual regression: **NOT_EXECUTED**.
- Branch CI: **NOT VERIFIED**; the workflow runs on main push or PR and the PR creation was blocked by the connector.

## Acceptance matrix (10 points total)
| Criterion | Result | Evidence / blocker |
| --- | --- | --- |
| FSRS-01 4 ratings x 4 states parity | NOT_RETESTED | Existing Core parity source; no fresh test |
| FSRS-02 eventId duplicate idempotency | PARTIAL | Client immutable identity/retry unit tests; Core source/tests already present |
| FSRS-03 lost-response retry | PARTIAL | Local state machine test PASS; no real HTTP |
| FSRS-04 offline restart & replay | PARTIAL | Shared in-memory store simulation; IndexedDB not committed/tested |
| FSRS-05 batch atomic rollback | SOURCE_ONLY | Existing Core transaction/test; not executed this run |
| FSRS-06 cross-user isolation | BLOCKED | No trusted principal/ownership schema |
| FSRS-07 undo end-to-end | BLOCKED | Only unsent cancel contract; Core has no compensating undo |
| FSRS-08 visual fidelity and truthful UI | SOURCE_ONLY | Review grade still disabled; no screenshot test this run |
| FSRS-09 server-canonical state | PARTIAL | Client ack validator ignores client FSRS state; no real Core integration |
| FSRS-10 bad owner/rating/conflict | PARTIAL | Local owner partition and HTTP conflict state tests; Core user ownership missing |

**Provisional score 2/10** is a management estimate for locally tested outbox logic, not a statement that two named criteria are fully complete.

## Pull request and safety
PR creation was attempted but rejected by connected tool safety checks. The branch remains available for review; do not claim CI green on it. No production access, no migration, no merge/deploy, no live review submission and no credential handling occurred.

## Phase 03 handoff — database parity
- Core review persistence: `review_logs.id` acts as event ID; `cards` stores FSRS scheduling fields. Audit unique keys, indexes, timestamp representation, foreign keys, and transaction semantics in isolated snapshot.
- New client event envelope: `schemaVersion=1, eventId, ownerKey, cardId, rating, reviewedAt` plus retry metadata; **ownerKey is local partition only, not auth proof**.
- Do not replay legacy `JapaneseSrsOfflineDB.pendingReviews` to Core. Migration of existing local queue requires separate format/provenance audit; do not delete it.
- Confirm Core batch idempotency/ordering and rollback against a snapshot clone or synthetic DB; do not infer parity with production from 316 JSON fixture cards.
- Required for future P02 completion: committed/tested IndexedDB adapter, principal-aware BFF write contract, per-user ownership mapping, no-double-write browser E2E, real undo semantics and cloud staging provenance.
- Preserve Core SHA pin in Web CI. No change to Core repo in this phase.
