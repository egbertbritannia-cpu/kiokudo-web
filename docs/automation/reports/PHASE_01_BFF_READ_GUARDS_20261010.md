# Phase 01 — BFF read guards implementation (2026-10-10)

**Status:** IMPLEMENTED_UNVERIFIED / Phase 01 remains PARTIAL / release NO-GO.

## Changes committed on this branch

- `src/lib/bff-read-policy.ts`: explicit Core GET path allowlist, URL query-key allowlist by endpoint, duplicate-key rejection, numeric limits, constrained lesson/session IDs, malformed-percent / control-character rejection.
- `src/app/api/backend/[...path]/route.ts`: enforce route + query validation before reading server credentials or contacting Core; validate every decoded URL segment; validate forwarded request ID.
- Existing `NODE_ENV=development` + localhost + `KIOKUDO_STAGING_READ_ENABLED=true` guard and shared service token storage on Web server remain unchanged.
- All browser-facing write methods still return 405 in enabled local preview; no review POST / mutation enabled. No production or staging DB access.

## Verification status

User explicitly requested no tests in this iteration. `npm run check`, `npm test`, `npm run build`, browser security tests, integration/CI and deploy are **NOT_EXECUTED / NOT_VERIFIED** for this branch. Source inspected against Core GET handlers; do not mark `DONE_VERIFIED`.

## Remaining Phase 01 blockers

1. Select and provision a verifiable session provider for the single-user learning app; no client-supplied user ID accepted.
2. Map existing cards/review logs/IELTS and grammar progress to a verified owner; legacy DB has no universal owner key.
3. Add Core authenticated-principal checks + per-user ownership for every private query/mutation, negative auth tests, and Web/Core integration tests.
4. Only after those gates, consider separate authenticated BFF write capability. Current write path stays disabled.

## Suggested next action

Review the branch, choose the session provider and ownership strategy, and implement authenticated principal + Core ownership as a separate controlled change. Do not merge/deploy as completed authentication.
