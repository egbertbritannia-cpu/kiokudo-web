# Phase 4B — Grammar / IELTS original-UI migration (staging reads only)

Source UI: `japanese-srs-system` @ `3348f4ee49c9539fb9ea60c96e42833811c325ca`.
**Design must not change.** All original Grammar Gallery/LessonCard/PatternCard/StructureDiagram JSX and IELTS layout are copied byte-for-byte. All pages retain the original styling, colors and hierarchy; only data adapters, failure states and mutation safety differ.

## Frontend status

| Page | Design | Backend behavior |
| --- | --- | --- |
| `/grammar` | Existing GrammarGallery untouched | SSR server-only staging Core GET for lessons/stats/pattern summaries |
| `/grammar/:lessonId` | Existing PatternCard untouched | SSR server-only staging Core lesson + pattern details |
| `/grammar/practice` | Original local quiz UI | BFF GET exercises; grades answers **locally only**, no FSRS mutation |
| `/ielts` | Original British/Oxford dashboard | BFF GET actual recorded progress; no default demo scores |
| `/ielts/session` | Original Examination Room, timer and draft | BFF GET materials; localStorage draft only; Submit button explains writes are disabled |
| `/ielts/review` | Original analysis/Vocab Vault | BFF GET sessions/vocab; scoring, mistake-save, vocab-save disabled rather than fake-persisted |

The server-only Grammar reader is restricted to `NODE_ENV=development`, `KIOKUDO_STAGING_READ_ENABLED=true` and `http://localhost` or `127.0.0.1` Core. It does not import Drizzle, Turso or production secrets into FE. The browser-facing BFF still enforces its old localhost-only read allowlist and service credential. This is a dev staging test architecture, **not** deployable public auth.

## Blocked / must not claim

- No real-data connection to Turso production, no authenticated user-specific access.
- No IELTS create session/log/mistake/vocab mutations and no grammar FSRS writes.
- No offline review replay, user-session security or cloud public staging.
- No Google OAuth, media, Grammar synthetic-card mapping or IELTS full behavioral parity.
- No screenshot pixel comparison yet: identical JSX/CSS helps visual fidelity, but browser-level verification is still required.
- Local Core fixture from earlier phase contains only cards/decks; Grammar/IELTS routes correctly return 503 until actual dedicated staging tables are provided. CI uses isolated minimal fixture tables for contract tests.

Next: complete isolated grammar/IELTS seeded fixtures and cross-repo API smoke, then implement per-user BFF auth/write contracts and end-to-end parity before production cutover. Do NOT weaken BFF auth to make these pages publicly functional.
