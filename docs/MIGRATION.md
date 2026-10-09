# Kiokudo Web — Phase 4A migration status

The user-approved direction is **frontend/backend separation with exact existing visual design**. No redesign is authorized.

- Complete: copied Studio, Culture, Cards, Karuta Review, Do Bai, local Conjugation, the original nav/CSS, all art assets and retained HTML demos into Web.
- Complete: real data read-only Cards Library and Review list connect through existing local-only `GET /api/backend/api/v1/cards` BFF.
- Complete: original sample-based Studio/Do Bai remain clearly identified as prototypes.
- Complete: review writes blocked in FE, no false offline event queuing; Add Card stays decommissioned.
- Complete: art/source blob SHA visual-fidelity checks added.
- Pending: screenshot comparisons and dynamic flows, authenticated review mutations, offline replay, real database integration, full Grammar/JPD133/IELTS/integrations, deployed staging, production cutover.

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
`74ecba7b43a379a7acaf968ef70023fc7373bc74`.
Cross-repo CI verifies the original BFF integration flow; the Web visual-fidelity test checks unchanged source blob SHA values.

Never put Turso credentials or database snapshots in GitHub or chat, and do not touch the old production Vercel project.

## Phase 4B read-only Grammar/IELTS contract

See [Phase 4B data contract and write-safety matrix](PHASE4B_GRAMMAR_IELTS.md).
Original Grammar and IELTS JSX/component designs were imported. Grammar/IELTS
staging GETs are supported by Core (pinned commit `67682872d78f37559e4c9e9d109c5c8320d418c1`);
all learner-progress/score/session writes remain intentionally blocked and
public deployments still cannot call Core. The original 316-card fixture
contains no Grammar/IELTS tables; those pages need a dedicated staging schema.
