# Kiokudo Phase 01 — code delivery, single owner (2026-10-10)

**Status: CODE_IMPLEMENTED_UNVERIFIED. No test/typecheck/build/deploy performed at operator request. NO_GO until configured and verified.**

## Chosen auth architecture

Kiokudo is a personal, single-owner learning system. The code provides a standalone password-based owner session without new OAuth or RBAC dependencies. It does NOT infer ownership from the browser or treat the shared Core bearer as an authenticated user.

- Login POST verifies a locally generated scrypt hash, never a plaintext password in source. An HttpOnly, SameSite=Strict, Secure-in-production session cookie carries an expiring HMAC-signed owner subject.
- Logout clears the cookie; GET session only returns a boolean. Next middleware checks cookie signatures on Cards, Review, Grammar, IELTS and staging views, including client pages that could otherwise display offline cached data.
- The browser BFF validates GET paths, queries, strict GET-only method, Origin/Fetch-Site, signed session, server-only Core bearer and request-bound 30-second owner assertion. Browser POST/PUT/PATCH/DELETE remains disabled.
- Server-rendered Grammar goes through the same authenticated owner assertion.
- Remote staging reads are opt-in, HTTPS-only, hostname-pinned; default production build remains closed. Core verifies staging DB identity separately.
- Core checks Web's shared service bearer and HMAC owner assertion (subject, issuer, audience, 30s expiry, method and path). Every private Core route is guarded centrally. Core explicitly requires a manually acknowledged single-owner staging dataset. Core write assertions also require a separate disabled-default staging-write flag; Web never issues them in P01.

## GitHub code locations

Web:
- src/lib/owner-auth-server.ts
- src/app/api/auth/login/route.ts
- src/app/api/auth/logout/route.ts
- src/app/api/auth/session/route.ts
- src/app/login/page.tsx
- src/middleware.ts
- src/lib/bff-read-policy.ts
- src/lib/staging-core-origin.ts
- src/app/api/backend/[...path]/route.ts
- src/lib/core-staging-server.ts
- scripts/hash-owner-password.mjs
- .env.example

Core (separate branch/PR):
- src/auth/single-owner.ts
- src/app.ts
- .env.example

## Operator setup needed before staging can function

1. Create a **strong unique password** (at least 16 characters). Generate its salted scrypt digest on a trusted local machine via scripts/hash-owner-password.mjs with KIOKUDO_OWNER_PASSWORD supplied securely. Never commit the password nor the real digest. Set only the digest as KIOKUDO_LOGIN_PASSWORD_SCRYPT in Web's deployment secret manager.
2. Generate **independent cryptographically random** 32+ character session HMAC and internal assertion HMAC secrets. Put KIOKUDO_SESSION_SECRET only in Web, KIOKUDO_INTERNAL_ASSERTION_KEY in Web and Core (same value), never use NEXT_PUBLIC_*.
3. Choose one stable non-sensitive KIOKUDO_OWNER_SUBJECT (letters/digits/_/-) and set identically on both servers; set unique KIOKUDO_CORE_SERVICE_TOKEN on Web to match Core KIOKUDO_SERVICE_TOKEN.
4. Verify the staging database's marker, origin and provenance outside this code. Set KIOKUDO_SINGLE_OWNER_DATASET_ACK=true **on Core only if that staging dataset truly belongs to this configured owner**. Do not set it for mixed/multi-user data.
5. For local development only: run Core at loopback and Web development preview with KIOKUDO_STAGING_READ_ENABLED=true. For remotely hosted **staging** only: set Web KIOKUDO_REMOTE_STAGING_READ_ENABLED=true, KIOKUDO_CORE_ALLOWED_HOST to an exact dedicated staging HTTPS hostname, and KIOKUDO_CORE_URL=https://that-host. Remote Web/Core hosting and credentials require separate operator approval.
6. Keep KIOKUDO_STAGING_WRITE_ENABLED=false, and never connect a production database or turn on review browser writes as part of Phase 01.

## Security limitations / known outstanding work

- This is an explicitly acknowledged single-owner database, **not multi-user row-level authorization**. Before introducing any second learner, schema owner columns plus per-row scoped queries and migration are mandatory. No existing production data has been relabeled or modified.
- A publicly exposed password endpoint also needs infrastructure-level brute-force/rate-limit protection and external session/provider policy; the code does not claim distributed rate limiting.
- Real staging identity + owner binding, credential provisioning, browser/Core integration, auth-negative tests, CI, E2E, visual parity and operator review remain **NOT_VERIFIED**.
- No admin dashboard, RBAC, UI redesign, Card creation, synthetic reviews, production migration or deployment was performed.

**NEXT:** configure approved staging secrets & owner association, review Web/Core draft PRs, perform acceptance/security checks in a separate authorized session, only then mark Phase 01 DONE_VERIFIED.
