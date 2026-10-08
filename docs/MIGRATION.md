# Kiokudo Web — Phase 3 migration status

Source baseline: `egbertbritannia-cpu/japanese-srs-system`, commit `3348f4ee49c9539fb9ea60c96e42833811c325ca`.

## Implemented

- Next.js app and three unchanged HTML UI demos + gallery.
- A **local-only** read-only BFF allowlisting `GET /api/v1/cards` and `GET /api/v1/status`, forwarding a server-held service token.
- `/staging/cards`: renders card IDs/decks/content returned by real Core staging API; not fake data.
- All review/card mutation methods through this BFF are deliberately disabled (405).
- When not in Node development mode on localhost, or when `KIOKUDO_STAGING_READ_ENABLED` is not true, BFF returns 503.

## Try the integration locally

1. In Core: `npm install` and `npm run staging:local -- seed ./staging-rehearsal.db`.
2. In Core `.env`, set `KIOKUDO_SERVICE_TOKEN` to a long random secret,
   `KIOKUDO_DATABASE_SCOPE=staging`, `KIOKUDO_DATABASE_URL=file:./staging-rehearsal.db`,\n   and `KIOKUDO_EXPECTED_STAGING_MARKER=kiokudo-local-json-fixture-not-production-v1`.\n   Core reads this identity marker from the freshly seeded local SQLite file\n   before accepting API requests; never reuse the fixture marker for Turso.
3. Start Core with `npm run dev` on `http://127.0.0.1:4000`.
4. In Web `.env.local`, set `KIOKUDO_STAGING_READ_ENABLED=true`,
   `KIOKUDO_CORE_URL=http://127.0.0.1:4000` and
   `KIOKUDO_CORE_SERVICE_TOKEN` to the SAME random secret.
5. Start Web with `npm run dev`; visit `http://localhost:3000/staging/cards`.
6. UI should display 316 fixture cards and 2 decks with `fixture_*` IDs.
   These are rehearsal cards, NOT current production progress.

Do not commit either `.env` file. Use two dedicated dev terminals. The fixture
SQLite contains only the 3 minimal entities and must not be mistaken for a full Turso migration.

## Still blocked / not done

- No export of real production Turso data, no verified staging Turso credentials, no schema migration of all live tables.
- No browser-accessible production API, no live FSRS scoring from the new FE.
- No public Vercel staging deployment or Vercel Authentication check performed.
- No actual backend deployment to cloud.
- Grammar special-case, IELTS and integrations remain on legacy.
- No cutover or changes to the legacy GitHub repo / production deployment.

**Do not enable read-only BFF outside local development until user authentication and full trust boundary are audited.**

## CI cross-repository version policy

The Web smoke test checks out Core at an **explicit SHA**
(`2dc57c6969b4bb5e3bd34207356c922fca6cf66a`, DB identity guard/FSRS parity).
This keeps Web CI reproducible across unrelated Core commits. Bump only
in a dedicated PR with an actual cross-repo staging smoke PASS.
This protects CI, not production deployment versioning.
