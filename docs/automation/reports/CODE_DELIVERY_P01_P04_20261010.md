# Kiokudo — Phase 01–04 code implementation handoff (2026-10-10)

**Delivery type:** source code on **two draft PRs**, not merged into main. **By user instruction, no tests, builds, TypeScript checks or migrations were run during this coding session.** The PRs may trigger standard GitHub CI automatically. All write gates remain disabled by default. Production, legacy learning history and Turso credentials were not accessed.

## Source branches and API contracts

| Component | Code review link | Tracked source |
| --- | --- | --- |
| Core backend | [Core draft PR #8](https://github.com/egbertbritannia-cpu/kiokudo-core/pull/8) | `agent/kiokudo-p01-p04-api-implementation-20261010` |
| Web frontend/BFF | [Web draft PR #10](https://github.com/egbertbritannia-cpu/kiokudo-web/pull/10) | `agent/kiokudo-p01-p04-fe-integration-20261010` |
| Endpoint index | `docs/API_ENDPOINTS.yaml` in both branches | **28 declared endpoints**: 25 Core + 3 Web auth |
| Payload docs | `docs/API_CONTRACT_PHASE_01_04.md` in both branches | methods, paths, JSON request/response, errors, auth gates, FE recipes |
| Staging schema | `kiokudo-core/migrations/20261010_p04_learning.sql` | additive, **operator-run on separately verified staging only** |

## Source delivery per phase

### P01 — Auth & BFF
- Web: asynchronous `crypto.scrypt` verification replaces synchronous password hashing; login requires explicit production ingress rate-limit attestation before accepting credentials. Existing HMAC owner cookie remains.
- Web BFF: explicit method/path allowlist for signed GET/POST/PUT staging-only proxy, trusted Origin and JSON checks, bounded payload. Server-only service token, signed assertion and current owner cookie required. Write gate default OFF in `.env.example`.
- Core: existing signed single-owner staging authorization continues to fail closed; no permissive production access was introduced.
- **External blocker**: actual ingress rate limit, owner-data provenance, staging secrets and HTTPS need independent operator configuration.

### P02 — FSRS online/offline/retry/undo
- Core: retained transactional FSRS and stable eventId dedupe; added snapshots **before** canonical grade and idempotent `POST /api/v1/reviews/{eventId}/undo` with persistent replay tombstones and latest-event-only eligibility.
- Web: copied pure outbox from P02 branch and added separate Dexie V2 persisted store with atomic claim/settle/cancel, reauthentication-aware retry, browser sender and canonical acknowledgment validation; Karuta `handleGrade` now stages and replays events instead of only showing placeholder notice.
- **External blocker**: new staging schema, browser end-to-end reconciliation, authenticated owner and write flags; server undo safety never activated on production.

### P03 — Data integrity/parity
- Core `scripts/audit_snapshots.py` patched with WAL/SHM/journal rejection, SQLite `integrity_check` + `foreign_key_check`, validated staging marker and rejected staging-as-baseline. No real snapshot was read/changed.
- **External blocker**: independently exported actual production read-only snapshot, operator-confirmed separate remote staging database and parity acceptance.

### P04 — Grammar/JPD133/IELTS
- Core: `learning-writes.ts` implements authenticated idempotent grammar attempt logging, stable JPD133 mapping GET and operator-gated mapping POST for real existing Core card IDs.
- Web: deterministic JPD133 source keys replace array-position identifiers; server page displays only mappings actually returned by Core. Grammar practice optionally posts an event with server-evaluated correctness.
- Core: `ielts-writes.ts` adds create-session, revisioned full-draft updates, idempotent submit, manual-only score, mistake create/update, vocabulary create. Existing GET session detail exposes revision and explicit manual score source.
- Web: IELTS session page has persisted event/session IDs and a frozen draft payload for lost-response retries; review page has manual score save, mistake edit and vocabulary create. No synthetic grading or automatic band history is invented.
- **External blocker**: provider-specific Google/media integrations still require approved provider contracts and configuration; no upload OAuth credentials or cloud file operations invented.

## No-test constraint and unresolved acceptance

- `TESTS_EXECUTED_IN_THIS_RUN: 0` (explicit user instruction).
- `BUILD_EXECUTED_IN_THIS_RUN: false`.
- `SCHEMA_MIGRATION_EXECUTED: false`.
- `SOURCE_BRANCHES_MERGED: false`.
- `PRODUCTION_MUTATION: false`.
- `PHASES_DONE_VERIFIED: 0/5` (code draft is not acceptance).
- `RELEASE_GATE: NO_GO` until security and migration gates verified.

### Reviewer handoff

1. Review linked draft PRs **together**, especially schema↔handler field compatibility, signed path/method semantics, offline retry, undo and IELTS concurrency.
2. Address compile/CI problems if GitHub Action starts automatically; do not claim passing tests until real log evidence.
3. Review additive migration and preflight DB identity; apply only to explicit separate staging after operator approval.
4. Configure a real ingress password throttle, verified single-owner dataset, per-environment server secrets, HTTPS staging Core host, while retaining write gates OFF until sign-off.
5. Activate & perform controlled staging acceptance and browser/offline/visual E2E *in a separate test task*, before any merge/deploy/production cutover.
6. Update checkpoint `ACTIVE_PROGRESS.md` after PR review; do not increase production-ready % merely because code exists on draft branches.

All documented Core and Web API endpoints are in both PR branches. The legacy Japanese SRS application remains unchanged.
