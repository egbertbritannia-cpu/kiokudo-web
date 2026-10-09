# Phase 4A — UI-fidelity-first migration (not redesign)

## Non-negotiable visual constraint

**Preserve the user's existing Kiokudo aesthetic exactly**: Studio navbar and ten tabs, washi/mokuban images, typography, gradients, artwork and responsive layouts. Do not replace with generic dashboards, UI libraries, new routes/themes or newly generated assets.

Source of truth: `egbertbritannia-cpu/japanese-srs-system` commit
`3348f4ee49c9539fb9ea60c96e42833811c325ca`.

Assets were copied from the pinned legacy commit in a one-time GitHub Actions migration, then that temporary workflow was removed. `tests/visual-fidelity.test.ts` checks Git blob hashes for the most important source files and images.

## Route matrix

| Visual route | Original UI fidelity | Data / backend | Behavior |
| --- | --- | --- | --- |
| `/` (Studio) | Exact source JSX/CSS | Embedded original samples | Same original hash-router prototype views, NOT live-data home |
| `/cards` | Copied existing page | GET via local-only Core BFF | Read-only actual SQLite staging cards/decks; errors visible |
| `/review` | Copied Karuta UI | Read-only Core BFF cards; local Dexie cache fallback | Reveal and controls visible; grading blocked (not fake-saved); no replay |
| `/review/dobai` | Exact original prototype | Embedded original samples | Local demo only; no FSRS writes |
| `/culture` | Exact original page | Original presentation | No new APIs |
| `/conjugation` | Original page/engine | Local JSON verbs | Local conjugation drill preserved |
| `/cards/new` | Original decommissioned page | None | Does not restore Add Card |
| `/curriculum/jpd133` and `/[slot]` | Exact legacy JSX, source manifest | Bundled original JPD133 JSON | Eight curriculum recovery slots; Dò bài links go to existing prototype, not DB-backed review |
| `/ui-demos/` | Exact original HTML files | Local static assets | Gallery remains available |
| `/staging/cards` | Existing Phase 3 diagnostics inspector | local-only GET | Read-only |

## Mutations blocked intentionally

- The browser cannot write to `/api/backend/*`: BFF remains a local-only GET allowlist.
- Karuta Review `handleGrade` **does not send HTTP, persist grade, or queue an event**. User sees the disabled status toast.
- The original ServiceWorkerRegister/PerformanceTracker are not mounted. In particular, no implicit offline review replay is triggered.
- No Turso environment variables in FE.
- Ported studio cards/shodo views retain the legacy prototype semantics, not production persistence.
- Remote/public deployments remain denied access to Core staging data.

## Pending gates

1. Make FE client-visible authentication and BFF-per-user authorization secure, not a single public shared service token.
2. Port and test genuine FSRS POST event writes, idempotency, retry/lost-response behavior and undo UX.
3. Reconcile JPD133 manifest IDs and grammar-synthetic-card behavior with real persistent IDs.
4. Migrate remaining Grammar, IELTS, curriculum, media and Google integration page/backend contracts.
5. Run screenshot/visual regression suite at desktop/mobile widths; hash equality verifies source bytes but not rendering parity across deployment changes.
6. Obtain verified staging Turso/test data then compare full feature behavior before production cutover.

No user-visible UI redesign should happen as part of those backend migrations.
