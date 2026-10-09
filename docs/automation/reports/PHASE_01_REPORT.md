# Kiokudo Phase 01/05 — Baseline + BFF

**Status:** PARTIAL; baseline 2/3, authentication 0/7; 2/10 points total. No production changes.

## Immutable baselines
- Web: `bbed3870a48cf0e61e0d251fe6035fc6551655c2`
- Core: `67682872d78f37559e4c9e9d109c5c8320d418c1`
- Legacy current: `08ef7d3425c36faee9f2208ad3876382aa886f3b`
- Legacy UI/FSRS reference: `3348f4ee49c9539fb9ea60c96e42833811c325ca`

## Verified baseline evidence
Web Actions run 37958850024: verify job and cross-repo staging smoke both successful at baseline SHA. Core Actions run 37947190394: check, npm tests, Python tests and build successful. These are CI results, **not local execution**. Local clone could not run due network/DNS; new P01 branch has no test results yet.

## Route inventory
- `/`: original Studio prototype; `/cards`: local BFF Core cards GET.
- `/review`: Core cards GET, grade disabled; `/review/dobai`: sample prototype.
- `/culture`: original portal; `/conjugation`: local engine.
- `/curriculum/jpd133` and `/[slot]`: static curriculum, persistent card mapping pending.
- `/grammar` and `/[lessonId]`: SSR local Core GET; `/grammar/practice`: BFF GET, local scoring.
- `/ielts`: dashboard GET; `/ielts/session`: materials GET and local draft, cloud save disabled; `/ielts/review`: session/vocab GET, writes disabled.
- `/cards/new`: decommissioned; `/staging/cards`: local GET inspector; `/ui-demos/*`: static.

## API and data boundary
Core has public health, service-bearer status, GET cards, POST reviews/batch, GET grammar catalog/practice/lesson, and GET IELTS dashboard/materials/sessions/detail/vocab/mistakes. The BFF forwards only allowlisted GETs in local development. Core uses a service token, **not a verified learner principal**. The Core Drizzle schema has 18 business tables; cards and review_logs do not have per-user ownership. No cross-user authorization proof exists. No remote staging identity or production snapshot is available.

## Phase acceptance
BASE-01 PASS (SHAs); BASE-02 PASS (source inventory); BASE-03 PARTIAL (baseline CI only); BASE-04 PASS (risk map).
AUTH-01 PARTIAL (browser writes currently blocked); AUTH-02 PARTIAL (source-only token isolation); AUTH-03 BLOCKED (no trusted principal); AUTH-04 BLOCKED (no user ownership); AUTH-05 PARTIAL (HTTP statuses only); AUTH-06 PARTIAL (operator decision pending); AUTH-07 PARTIAL (new branch untested).

## Change status and handoff
A pure `src/lib/bff-read-policy.ts` helper exists on the P01 branch, but it is **not wired into the BFF** and is **not a deployed security control**. Do not merge as a completed feature without route integration and tests.

P02 must keep browser review POST disabled. It may build a persistent offline queue and stable eventId contract in isolated tests, but cannot send real writes until authenticated principal and owner mapping are proven. Core review API supports eventId/cardId/rating/reviewedAt; legacy Web offline sync still targets `/api/review` rather than authenticated Core BFF. No fake review history, no production DB operations.

**Release:** NO-GO. Requires identity-provider decision, ownership strategy, real staging verification and snapshot parity.
