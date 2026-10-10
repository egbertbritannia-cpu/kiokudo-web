# 記憶道 — Kiokudo Web

Next.js frontend for Japanese curriculum practice, Dò bài, Grammar, JPD133, culture and IELTS, with an authenticated staging BFF.

## Removed: Add Card and Flashcard Review (2026-10-10)

The user-facing flashcard library `/cards`, creation page `/cards/new`, FSRS study page `/review`, and staging cards inspector `/staging/cards` have been removed. The Studio's Karuta/flashcard, Cards and Shodo composer subviews (`/#/karuta`, `/#/cards`, `/#/shodo`) no longer render. Navigation, flashcard-only client outbox, FSRS worker and BFF `/api/v1/cards` and `/api/v1/reviews*` access have been removed.

The separate **Dò bài** feature (`/review/dobai`), **Grammar**, **JPD133 curriculum**, **IELTS**, **Culture**, and **Conjugation** stay supported. Historical card rows in staging/legacy SQLite may still be referenced for migration fidelity; no production data or history was deleted.

## Switching between Japanese and IELTS

A compact, round, icon-only **SystemSwitcher** sits in the navbar on desktop and mobile. It is a normal accessible link (keyboard Enter, focus ring, tooltip and accessible name).

- Japanese studio keeps the existing hash routes such as `/#/`, `/#/grammar`, and `/#/dobai`. The icon links to `/ielts`.
- IELTS uses canonical Next.js routes `/ielts`, `/ielts/session`, and `/ielts/review`. The icon links back to `/#/`.
- The root Japanese navbar does **not** render on IELTS routes; the existing IELTS navbar includes the same shared switcher instead. This prevents stacked navbars.
- Legacy `/#/ielts`, `/#/ielts/session`, and `/#/ielts/review` links redirect to their canonical IELTS pages. Other retired IELTS hash subroutes fall back to `/ielts`.
- The obsolete JA/EN banner-only toggle on the Japanese Home screen is retired to avoid two competing system switchers.
- No backend, database, authentication, flashcard or learning-session logic changes were made as part of the navigation migration.

Shared routing helpers: `src/lib/system-routes.ts`; routing tests: `tests/system-switcher-routing.test.ts`.

## Development

```bash
npm install
cp .env.example .env.local
npm run check
npm test
npm run build
```

`/api/auth/login`, `/api/auth/logout`, and `/api/auth/session` handle the single-owner session. The BFF at `/api/backend/api/v1/*` allows only retained staging Grammar, curriculum and IELTS routes with signed Core owner assertions and explicit write gates. A production deployment and actual staging data acceptance require operator verification; successful CI with synthetic fixtures is not production acceptance.

For current API details see `docs/API_ENDPOINTS.yaml`; legacy migration documentation may refer to retired FSRS workflows for historical audit only.
