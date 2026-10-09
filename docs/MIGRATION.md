# Kiokudo Web — Phase 4B migration status

The user-approved direction is **frontend/backend separation with exact existing visual design**. No redesign is authorized.

- Complete: copied Studio, Culture, Cards, Karuta Review, Do Bai, local Conjugation, the original nav/CSS, all art assets and retained HTML demos into Web.
- Complete: real data read-only Cards Library and Review list connect through existing local-only `GET /api/backend/api/v1/cards` BFF.
- Complete: original sample-based Studio/Do Bai remain clearly identified as prototypes.
- Complete: review writes blocked in FE, no false offline event queuing; Add Card stays decommissioned.
- Complete: art/source blob SHA visual-fidelity checks added.
- Complete: original Grammar/IELTS view components migrated without redesign, staging read-only GET contracts, explicit unavailability/error states and no fabricated IELTS statistics.
- Complete: CI-only Grammar/IELTS fixture smoke across Web BFF and Core Fastify.
- Pending: screenshots across viewports, authenticated review/IELTS writes, offline replay, real database connection, synthetic grammar IDs, full external integrations, deployed staging and production cutover.

## Local staging read test

1. In `kiokudo-core`: install deps, run `npm run staging:local -- seed ./staging-rehearsal.db`.
2. Configure Core `.env`: long random `KIOKUDO_SERVICE_TOKEN`,
   `KIOKUDO_DATABASE_SCOPE=staging`, `KIOKUDO_DATABASE_URL=file:./staging-rehearsal.db`,
   `KIOKUDO_EXPECTED_STAGING_MARKER=kiokudo-local-json-fixture-not-production-v1`.
3. Start Core `npm run dev` on local port 4000.
4. In Web `.env.local`: set `KIOKUDO_STAGING_READ_ENABLED=true`,
   `KIOKUDO_CORE_URL=http://127.0.0.1:4000`,
   and `KIOKUDO_CORE_SERVICE_TOKEN` to the same private random token.
5. Start Web `npm run dev`; use `/cards`, `/review`, `/staging/cards` and `/`.
6. Cards list should show 316 `fixture_*` rehearsal entries from the seeded data,
   **not** current learner progress. Review grade attempts are disabled.

CI pins the separate Core repository to revision
`67682872d78f37559e4c9e9d109c5c8320d418c1`.
Cross-repo CI verifies Cards and temporary CI-only Grammar/IELTS fixtures across BFF→Core; the Web visual-fidelity test checks unchanged source blob SHA values.

Never put Turso credentials or database snapshots in GitHub or chat, and do not touch the old production Vercel project.

## Phase 4B read-only Grammar/IELTS contract

See [Phase 4B data contract and write-safety matrix](PHASE4B_GRAMMAR_IELTS.md).
Original Grammar and IELTS JSX/component designs were imported. Grammar/IELTS
staging GETs are supported by Core (pinned commit `67682872d78f37559e4c9e9d109c5c8320d418c1`);
all learner-progress/score/session writes remain intentionally blocked and
public deployments still cannot call Core. The original 316-card fixture
contains no Grammar/IELTS tables; those pages need a dedicated staging schema.
