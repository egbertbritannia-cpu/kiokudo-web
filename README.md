# 記憶道 — Kiokudo Web

Next.js frontend for Japanese curriculum practice, Dò bài, Grammar, JPD133, culture and IELTS, with a private, owner-scoped staging BFF.

## Removed: Add Card and Flashcard Review (2026-10-10)

The user-facing flashcard library `/cards`, creation page `/cards/new`, FSRS study page `/review`, and staging cards inspector `/staging/cards` have been removed. The Studio's Karuta/flashcard, Cards and Shodo composer subviews (`/#/karuta`, `/#/cards`, `/#/shodo`) no longer render. JPD133-to-card mapping APIs are also retired. Navigation, flashcard-only client outbox, FSRS worker and BFF `/api/v1/cards` and `/api/v1/reviews*` access have been removed.

The separate **Dò bài** feature (`/review/dobai`), **Grammar**, **JPD133 curriculum**, **IELTS**, **Culture**, and **Conjugation** stay supported. Historical card rows in staging/legacy SQLite may still be referenced for migration fidelity; no production data or history was deleted.

## Albion IELTS visual design — frozen reference

**User-owned design source:** `Kiokudo Studio · 日本語 _ Albion IELTS(1).html`, English sections `ENAV`, `E[""]`, `E.tracker`, `E.writing`, `E.speaking`, `E.mistakes`, and `[data-sys=en]` CSS. The original `E.vocab` screen has intentionally been retired. Do not restyle or replace the Albion look with the former Oxford-blue IELTS dashboard. `src/app/ielts/albion.css` is deliberately scoped to the English system so the Japanese UI stays unchanged.

The **five remaining navbar tabs and order** are Home, Tracker, Writing, Speaking, Logbook. URLs are `/ielts`, `/ielts/tracker`, `/ielts/writing`, `/ielts/speaking`, `/ielts/mistakes`; links from the reference HTML `/#/en/*` redirect to these canonical pages. The retired `/ielts/vocab` URL and `/#/en/vocab` bookmark resolve to Albion Home. The original ALBION crest, parchment/dark green/burgundy/gold colors, Cormorant Garamond headings, Be Vietnam Pro body, double borders, grid proportions, desktop header and mobile pill are maintained. The only pre-approved visual exception is the **small round system switcher in the navbar**, instead of the large floating text switch in the original HTML.

Original HTML sample scores, mistake logs, essay ratings and speaking history are **demonstration data**, not the user's results. Albion Tracker and Logbook read the existing authenticated/private Core endpoints when available; empty results are not replaced with fabricated user progress. Writing/Speaking logs and new manually entered Tracker/Logbook records currently persist locally in the browser, not to Core; these are not claimed synchronized. The five remaining English views retain reference styling. The frontend Vocabulary page is deleted; backend vocabulary API/data is unchanged. Deleted FSRS card creation and review workflows remain removed.

Existing `/ielts/session` and `/ielts/review` backend-connected application routes remain for compatibility; they were not in the six screens of the supplied Albion HTML and were not removed. Run `npm run check` and `npm test` before deploying.

## Retired navigation modules (2026-10-10)

- **Japanese Kura:** removed from desktop/mobile navbar, Japanese root page and fake latency/status timer. Legacy `/#/kura` hashes return to `/#/`. No database or backup scripts were removed.
- **English Vocabulary:** removed `/ielts/vocab/page.tsx`, both navbar items and the `Study Words` CTA. Old `/ielts/vocab` redirects to `/ielts`; legacy `/#/en/vocab` hashes also open `/ielts`. Existing English study-plan copy and backend vocabulary data/API remain intact; removal is a UI-route change only.

## Switching between Japanese and IELTS

A compact, round, icon-only **SystemSwitcher** sits in the navbar on desktop and mobile. It is a normal accessible link (keyboard Enter, focus ring, tooltip and accessible name).

- Japanese studio keeps the existing hash routes such as `/#/`, `/#/grammar`, and `/#/dobai`. The icon links to `/ielts`.
- IELTS uses canonical Next.js routes `/ielts`, `/ielts/session`, and `/ielts/review`. The icon links back to `/#/`.
- The root Japanese navbar does **not** render on IELTS routes; the existing IELTS navbar includes the same shared switcher instead. This prevents stacked navbars.
- Legacy `/#/ielts`, `/#/ielts/session`, and `/#/ielts/review` links redirect to their canonical IELTS pages. Other retired IELTS hash subroutes fall back to `/ielts`.
- The obsolete JA/EN banner-only toggle on the Japanese Home screen is retired to avoid two competing system switchers.
- The UI does not require app login: `/login` now redirects to Japanese Home and `/ielts` is not protected by the old page middleware. See **Login-free access** below for the separate data gate.

Shared routing helpers: `src/lib/system-routes.ts`; routing tests: `tests/system-switcher-routing.test.ts`.

## Development

```bash
npm install
cp .env.example .env.local
npm run check
npm test
npm run build
```

## Login-free access

**No application login screen:** Japanese studio `/#/` and IELTS `/ielts`, `/ielts/session` and `/ielts/review` can be opened directly and switched using the round navbar icon. The old `/login` URL redirects home.

**Backend privacy remains separate:** Without an app login, anyone able to access a publicly hosted URL could read or change learning records if the backend were made open. The BFF therefore denies no-cookie Core data requests by default on public hosts (`403 private_data_access_disabled`), but keeps the UI usable. No automatic scores or fake data are used as a substitute.

- **Local development:** `KIOKUDO_LOGINLESS_LOCAL_ENABLED=true` allows localhost/127.0.0.1 to use the configured `KIOKUDO_OWNER_SUBJECT` for signed BFF→Core requests. Requires normal Core staging read/config gates; use `false` on a shared development machine.
- **Private hosted installation:** Only AFTER separately protecting the entire deployment at the edge so nobody else can access it, set both `KIOKUDO_LOGINLESS_PRIVATE_MODE=true` and `KIOKUDO_PRIVATE_INGRESS_VERIFIED=true`, and pin `KIOKUDO_WEB_PUBLIC_ORIGIN` to the exact HTTPS host. **These environment flags are operator assertions, NOT security controls. They must never be enabled on a public/unprotected site.**
- **Public/unprotected installation:** The navigation works without login, but staging/Core read/write requests without a valid legacy signed session are denied. Do not opt in to loginless private BFF data access on such a deployment.
- Existing signed session/auth endpoints remain in the code for legacy compatibility; they are not part of normal navigation and the password form is removed. No Core secrets are exposed in the browser. Existing Core service token, signed method/path owner assertion, allowlist, staging provenance, CSRF checks and separate write gates remain in force.

The BFF at `/api/backend/api/v1/*` only allows retained staging Grammar, curriculum and IELTS routes with signed Core owner assertions and explicit write gates. Production deployment and staging data acceptance still require operator verification; synthetic fixtures are not production acceptance.

For current API details see `docs/API_ENDPOINTS.yaml`; legacy migration documentation may refer to retired FSRS workflows for historical audit only.
