# 記憶道 — Kiokudo Web

Kiokudo Frontend — **faithful migration of the existing Kiokudo UI**, not a redesign.

> **Phase 4A staging preview.** The original `japanese-srs-system` remains the live production application. No production cutover or Turso production connection has occurred.

## Preserved UI

The visual design from legacy commit `3348f4ee49c9539fb9ea60c96e42833811c325ca` was copied directly:

- `/`: Kiokudo Studio, its existing ten hash views and navigation.
- `/cards`: traditional woodblock/washi Cards Library, backed by **read-only** Core cards API.
- `/review`: preserved existing Karuta/Review look; **grading deliberately disabled** until authenticated BFF + offline queue parity passes.
- `/review/dobai`: original prototype UI (local sample cards; does not persist FSRS).
- `/culture`: original culture portal.
- `/conjugation`: original local verb conjugation drill UI and engine.
- `/cards/new`: original decommissioned Add Card route.
- `/ui-demos/`: all three original standalone HTML prototypes remain.
- `/staging/cards`: previous local-only read-only integration inspector.

Studio, Culture, Dò bài and the original global CSS/navbar, artwork and art manifest are **byte-for-byte identical** to legacy. The original Cards/Review UI markup is preserved; only backend data URLs, failure messages and staging write-guard behavior have changed. `tests/visual-fidelity.test.ts` guards this.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The local BFF remains fail-closed without explicit staging configuration. To read actual cards through a disposable local database, follow [migration instructions](docs/MIGRATION.md) and Core's separate local fixture seed.

### Do not misrepresent prototypes as live

The Studio hash subviews and standalone Dò bài are still the same original in-memory prototypes. The new Review page does **not** save grades, return success, or enqueue false events. No Add Card API is present. The PWA service worker and telemetry are not mounted until their destination routes and privacy boundary have been migrated.

## Migration next

Authentication and per-user scoping in the BFF; transactional FSRS writes plus stable offline event IDs, review undo semantics, grammar/JPD133 real ID mapping, IELTS, external integrations and full production-backend parity are still pending.

See [Phase 4 fidelity matrix](docs/PHASE4_UI_FIDELITY.md).
