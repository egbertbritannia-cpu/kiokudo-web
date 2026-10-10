# 記憶道 — Kiokudo Web

Next.js frontend for Japanese curriculum practice, Dò bài, Grammar, JPD133, culture and IELTS, with an authenticated staging BFF.

## Removed: Add Card and Flashcard Review (2026-10-10)

The user-facing flashcard library `/cards`, creation page `/cards/new`, FSRS study page `/review`, and staging cards inspector `/staging/cards` have been removed. The Studio's Karuta/flashcard, Cards and Shodo composer subviews (`/#/karuta`, `/#/cards`, `/#/shodo`) no longer render. JPD133-to-card mapping APIs are also retired. Navigation, flashcard-only client outbox, FSRS worker and BFF `/api/v1/cards` and `/api/v1/reviews*` access have been removed.

The separate **Dò bài** feature (`/review/dobai`), **Grammar**, **JPD133 curriculum**, **IELTS**, **Culture**, and **Conjugation** stay supported. Historical card rows in staging/legacy SQLite may still be referenced for migration fidelity; no production data or history was deleted.

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
