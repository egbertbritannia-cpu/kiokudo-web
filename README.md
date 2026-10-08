# 記憶道 — Kiokudo Web

> Independent Next.js frontend for Kiokudo. **Migration preview only; NOT the live application.**

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`. This preview presents the three standalone design concepts from the original repository, with no production FSRS mutations.

## Scope

- Next.js UI, design assets, future pages and PWA/Dexie offline queue
- Thin **same-origin BFF only** under `/api/backend/*`
- Browser talks to BFF; BFF talks to the independent [Kiokudo Core](https://github.com/egbertbritannia-cpu/kiokudo-core) via server-only bearer credential
- Do **not** connect UI demo buttons to production writes
- No Turso / Google / LLM secrets and no business logic in this repository

Backend BFF configuration:
- `KIOKUDO_CORE_URL`: core origin, e.g. `http://127.0.0.1:4000` locally
- `KIOKUDO_CORE_SERVICE_TOKEN`: same value as core's `KIOKUDO_SERVICE_TOKEN`; never `NEXT_PUBLIC_*`

This preview uses `npm install` in CI until a generated lockfile is committed.

[Migration status and boundaries](./docs/MIGRATION.md)

Original running application: [japanese-srs-system](https://github.com/egbertbritannia-cpu/japanese-srs-system). Its code and Vercel production deployment are unchanged by this bootstrap.
