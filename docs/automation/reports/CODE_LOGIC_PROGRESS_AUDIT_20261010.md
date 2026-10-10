# Kiokudo — Code-flow progress audit (2026-10-10, ~17:42 ICT)

**Scope:** Read-only inspection of GitHub `main` for `kiokudo-web` and `kiokudo-core`, prior dedicated P01 CI report and the active checkpoint. No production/staging DB credentials or real learning data were accessed. **No tests were run in this audit session**; CI references below are results of earlier runs. No code was changed or deployed. This is a source-level logic trace with separately marked historical CI evidence.

## 1. Immutable audit base and evidence levels

| Repo | SHA checked | Meaning |
| --- | --- | --- |
| Web main | `0c4c7089797c29ffc1e2a8fdacce230c02a61db6` | HEAD at audit start; only checkpoint/docs commits beyond the auth merge |
| Web auth merge | [`873233f12031bf3c7fa40fce8d7897bec9183584`](https://github.com/egbertbritannia-cpu/kiokudo-web/commit/873233f12031bf3c7fa40fce8d7897bec9183584) | PR #9 content is on `main` |
| Core main | [`7cb95fada09375a265ebbb2f6cfca6316dfb53f9`](https://github.com/egbertbritannia-cpu/kiokudo-core/commit/7cb95fada09375a265ebbb2f6cfca6316dfb53f9) | PR #6 content is on `main` |
| Web P01 CI | [38012855155](https://github.com/egbertbritannia-cpu/kiokudo-web/actions/runs/38012855155) | Prior branch CI: reported PASS including isolated two-server smoke |
| Core P01 CI | [38012513903](https://github.com/egbertbritannia-cpu/kiokudo-core/actions/runs/38012513903) | Prior branch CI: reported PASS including unit/Python/check/build |

**Correction to previous reports:** Core PR #6 is **merged**, not still open. Both P01 code paths now exist on `main`. These merges are an objective implementation gain; they do **not** prove secure real staging is provisioned. Web CI file still pins Core at PR head `6a7530dee4ecb1ab8e3ecc80dbf3c86f19e4c894` rather than the new Core main merge SHA. Pin consistency must be explicitly updated after compatibility verification.

**Confidence vocabulary:** `SOURCE_VERIFIED_MAIN` means the code is present and control flow was manually traced, `CI_VERIFIED_PRIOR_BRANCH` means an earlier CI run reported success for feature code, `NOT_EXECUTED_THIS_AUDIT` for fresh tests, `BLOCKED_EXTERNAL` means cannot claim deployed/real-data behavior.

## 2. Request/response logic trace

### P01 — Identity, BFF, Core owner gate

1. Web login [`src/app/api/auth/login/route.ts`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/app/api/auth/login/route.ts) requires trusted request Origin, parses JSON with a size bound and verifies configured scrypt password hash.
2. [`src/lib/owner-auth-server.ts`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/lib/owner-auth-server.ts) signs a 12-hour owner cookie with HMAC; middleware checks cookie signature and owner subject for protected learner routes. **Finding P01-F1:** password verification uses synchronous `scryptSync` in a request handler. This blocks Node event-loop while computing each hash; application and infrastructure rate limiting are not evidenced. Fix to async `scrypt` + public ingress throttling before broad exposure.
3. Web [`src/app/api/backend/[...path]/route.ts`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/app/api/backend/%5B...path%5D/route.ts) allows only GET with path/parameter allowlist, rejects untrusted Origin, requires a signed owner session, signs request-bound `x-kiokudo-owner-assertion` and forwards a server-only service bearer to pinned staging Core. POST/PUT/PATCH/DELETE are 405; no browser writes are enabled. [BFF read policy](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/lib/bff-read-policy.ts) refuses unapproved paths, repeated query keys and malformed values.
4. Core [`src/app.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/app.ts) requires service bearer then signed owner assertion for private routes, except operational health/status. [`src/auth/single-owner.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/auth/single-owner.ts) validates HMAC, subject, issuer, audience, exact HTTP method, exact path/query, read/write scope and expiry. It fails closed unless `KIOKUDO_SINGLE_OWNER_DATASET_ACK=true` and denies writes unless `KIOKUDO_STAGING_WRITE_ENABLED=true`. Web still cannot sign write assertions. **This is a single-owner dataset boundary, not general multi-tenant row-level ownership.** That is acceptable only if operator proves the DB has precisely the one intended owner.
5. [`src/db/staging-identity.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/db/staging-identity.ts) requires staging scope and an exact staging marker; remote DB with local fixture marker is refused. This is defense-in-depth, not evidence that real remote staging was created.

**P01 assessment:** signed auth/BFF code is now merged in both repos, earlier isolated fixture CI passed. Missing: fresh main-sha CI verification, actual staging configuration and owner provenance, public rate limiting, browser/staging security E2E, explicit operator approval. `PARTIAL`, **not DONE_VERIFIED**.

### P02 — Review/FSRS and offline

1. Web [`src/app/review/page.tsx`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/app/review/page.tsx) reads Core cards through GET. Its `handleGrade` around lines 345–355 merely displays a preview notice; it does not enqueue or POST reviews. Undo UI state is not a compensating Core undo.
2. The new pure outbox `src/lib/fsrs-review-outbox.ts` is **absent from Web main** (GitHub 404 during audit). P02 work exists on branch `agent/kiokudo-p02-outbox-20261010`; 10 unit tests PASS were reported earlier with a temporary local runner. Neither IndexedDB adapter nor production Browser→BFF→Core replay integration is established on `main`.
3. [`src/lib/offline-db.ts`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/lib/offline-db.ts) contains legacy Dexie storage and `syncPendingReviewsToServer`; it defaults to legacy `/api/review` and uses `/api/review/batch`. Do not replay legacy queue to Core without explicit wire-shape/provenance migration; do not confuse presence of this code with active new review sync.
4. Core [`src/routes/reviews.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/routes/reviews.ts) registers POST single/batch endpoints, but service bearer + signed owner + write flag guards apply before handlers. [`src/services/review-service.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/services/review-service.ts) uses an FSRS transition, `review_logs.id` as event ID, transaction-bound card mutation and history log insertion, duplicate acknowledgment and conflict rejection; batch requires stable IDs. The Core primitive exists but the Web UI is deliberately disconnected.

**P02 assessment:** `PARTIAL`; backend logic source-present, browser grading/offline persistence/replay/undo E2E NOT DONE.

### P03 — DB parity/migration

- [`src/db/schema.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/db/schema.ts) defines the migrated tables, but schema agreement at source alone cannot prove row/history parity. Core startup staging-marker check is a guard, not clone proof.
- Current Core `main` [`scripts/audit_snapshots.py`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/scripts/audit_snapshots.py) compares schema objects/table counts/content hashes read-only. **Source-level gaps remain:** it checks only presence of `kiokudo_deployment_identity` table, not a nonempty environment-specific marker row; no `PRAGMA foreign_key_check`, no `PRAGMA integrity_check`, and no rejection of adjacent WAL/SHM sidecar files before `immutable=1` reading. A baseline bearing a staging marker is not rejected in `compare`. These are testable missing rejection branches.
- Earlier P03 local patch reportedly passed 32/32 tests but patch/test suite were **not merged into Core main**. No verified production export or independent remote Turso staging was used in this audit.

**P03 assessment:** `PARTIAL/BLOCKED_EXTERNAL`. Need land audited guards and isolated negative tests, then seek independently verified export/staging; no real-data parity claim.

### P04 — Grammar/JPD133/IELTS

- Core [`src/routes/grammar.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/routes/grammar.ts) implements GET lesson/catalog/practice endpoints with DB-backed reads, but card association uses `deckId='grammar_jpd133'` and substring `tags.includes(`lesson-${l.id}`)`; this is **not a stable foreign-key mapping**. New persistent grammar/FSRS mutation endpoints are absent.
- Web [`src/app/grammar/practice/page.tsx`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/app/grammar/practice/page.tsx) retrieves practice questions via BFF GET, saves attempts to `sessionStorage`, not to a server-side learner history table.
- Core [`src/routes/ielts.ts`](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/src/routes/ielts.ts) registers only GET dashboard/materials/sessions/detail/vocab/mistakes.
- Web [`src/app/ielts/session/page.tsx`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/app/ielts/session/page.tsx) auto-saves drafts to `localStorage`; `handleSubmitSession` only alerts that staging submission is disabled. [`src/app/ielts/review/page.tsx`](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/src/app/ielts/review/page.tsx) also blocks score/mistake/vocab writes. JPD133 needs verified ID mapping before FSRS history linkage; no confirmed storage integration in this audit.

**P04 assessment:** `PARTIAL`: read-only source code present, cloud writes/provenance/mapping not integrated; earlier local contract tests aren't product E2E.

### P05 — E2E/release

- [Web CI workflow](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/.github/workflows/ci.yml) runs Web unit/check/build and a synthetic Web→Core smoke with SQLite staging fixture and fixed CI-only credentials. [Core CI](https://github.com/egbertbritannia-cpu/kiokudo-core/blob/main/.github/workflows/ci.yml) runs Node/Python/check/build and owner-auth fixture tests.
- **This audit did not execute the workflows or inspect new main-commit Action logs**. Prior PR test report records Web 13 dedicated/23 full tests PASS, Core 4 dedicated/26 full tests PASS plus 14 Python tests, isolated two-server smoke PASS. These are evidence of historical branch testing, not verified real-staging E2E.
- Real staging, browser offline replay, visual regression, full database snapshot parity, rollback rehearsal, operator cutover approval: **not verified**. `NO_GO` remains.

## 3. Progress reconciliation (never confuse metrics)

Previous `63%` = **legacy 55/100 estimate** + **8/45 provisional phase points**; it was not a measured production readiness score. The 55% baseline itself was not revalidated in this source audit.

Given **two Phase 01 code branches now merged on main** (not merely PR-ready), the planning estimate can reasonably be **reweighted P01 from 2/10 → 4/10** (a *subjective management estimate*, not four acceptance criteria fully proved). The other historically provisional figures are unchanged:

| Phase | Previous provisional points | Revised provisional points | DONE_VERIFIED |
| --- | ---: | ---: | --- |
| 01 Auth/BFF | 2/10 | **4/10** (source merged + prior CI fixture) | NO |
| 02 FSRS/offline/undo | 2/10 | 2/10 (mostly branch/local) | NO |
| 03 Data parity | 2/8 | 2/8 (patch local only) | NO |
| 04 Grammar/IELTS | 1/12 | 1/12 (local contract only) | NO |
| 05 E2E/release | 1/5 | 1/5 (planning/report only) | NO |
| **Total** | **8/45** | **10/45 provisional** | **0/5 phases** |

Hence **55 + 10 = ~65% planning estimate**, while **production-ready is NO** and not meaningfully quantifiable as a percent from this evidence. Treat `~65%` as a provisional planning number only; it cannot be cited as verified integrated functionality. Not all awarded points represent main-merged code, especially phases P02–05.

## 4. Next 1–3 tasks, in dependency order

1. **P01-ASYNC-SCRYPT-RATE-LIMIT**: replace blocking `scryptSync` with async `crypto.scrypt` via safe tests; add or provision public ingress login rate-limit, no sensitive logging.
2. **P01-CI-PIN-AND-REAL-STAGING**: align Web smoke Core pin after verifying `7cb95fad...`; verify both current main builds and signed Web/Core traffic on **isolated real staging** after operator provides approved secrets and confirms one-owner provenance. Existing CI branch evidence does not substitute this.
3. **P01-GATE-ACCEPTANCE**: retain browser Review POST disabled; only tick P01 when security, ownership, CI, integration and operator gates are demonstrably PASS. Then move to P02 (wire queue/IndexedDB/undo with ID-safe tests). In parallel, isolated P03 patch can be reviewed but not mark P03 DONE.

## 5. Audit integrity

No new test command or PR/feature implementation was executed/created during this source audit. Exact GitHub file presence and control flow checked; prior CI outcomes quoted from [P01 test evidence report](PHASE_01_TEST_REPORT_20261010.md). No production database read, migration, merge, deployment, secret handling or code write was performed as part of this audit. GitHub documentation updates should not be counted as code functionality.
