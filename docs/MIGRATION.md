# Kiokudo Web — Migration Progress

Source baseline: `egbertbritannia-cpu/japanese-srs-system` commit `3348f4ee49c9539fb9ea60c96e42833811c325ca`.

## Bootstrap scope

- New Next.js app, standalone build and CI.
- Static UI demos copied **unchanged** from `public/ui-demos` in legacy.
- Thin BFF under `/api/backend/[...path]`, including fail-closed service token, origin check and restricted forwarding headers.
- Web data access not yet migrated. **No fake user data is presented as live.**

## Remaining migration steps

1. Freeze REST API contracts and explicit names/IDs for grammar, JPD133, IELTS, media and reviews.
2. Migrate canonical ReviewService + Turso logic to Kiokudo Core with idempotency tests.
3. Replace server-side DB imports in legacy UI with BFF-backed fetching; preserve genuine card IDs.
4. Move functional Next.js pages/components into web; keep the three HTML files only as visual references.
5. Migrate Dexie queue + batch event sync and verify lost-response retries.
6. Configure Vercel Authentication on the **new** web Vercel project, then server-to-server core authentication.
7. Add browser E2E tests and cross-repo staging deploy.
8. Cut over production only after tests, monitoring and rollback checks pass.

## Important product constraints

- Add Card was decommissioned. Studio Shodo is visual prototype **only**, not an approved live creation feature.
- `/review/dobai` in recent monolith uses example data; do not treat it as the canonical SRS implementation.
- No Turso or AI provider credentials in web or browser bundles.
- Legacy production is not changed or disabled by this repository.

Current status: **bootstrap in progress**; no production cutover.
