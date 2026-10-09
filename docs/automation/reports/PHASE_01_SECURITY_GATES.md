# P01 — Security gate matrix and operator decisions

This note accompanies `PHASE_01_REPORT.md` and is **not** a claim of implemented authentication.

## Trust boundaries

Browser is untrusted. Kiokudo Web is the only intended browser-facing BFF. Kiokudo Core currently authenticates an opaque service bearer only. The database contains shared cards/review logs without a per-user owner key. The current Web BFF forwards GET only in localhost development; production writes remain disabled.

The legacy pinned `src/lib/auth-guard.ts` is not an acceptable replacement for authenticated user sessions: it has development bypasses and a permissive fallback. Do not port it. Google OAuth integration status is not a verified Kiokudo learner session.

## Required architecture before browser writes

1. Select a session provider and verify signed, expiring user identity server-side; do not accept `userId` from browser JSON or unsigned headers.
2. Establish a reviewed single-owner mapping or real owner keys for every private row, including Cards, ReviewLogs, Grammar progress and IELTS data.
3. Bind Core authorization to a trusted assertion with subject, issuer, audience, expiry and scope. The existing service token alone is insufficient.
4. Enforce owner scoping in every Core query and mutation, not only in the UI. Add negative tests with two synthetic users.
5. Use HttpOnly/Secure/SameSite session cookies as appropriate; define CSRF protection for state-changing methods. Never expose Core service credentials to the browser.
6. Enable POST forwarding only after tests pass. Keep an explicit disabled default and do not migrate production schema without approved snapshot parity.

## Executable test backlog

| ID | Test scenario | Expected |
| --- | --- | --- |
| SEC-01 | Anonymous Web review POST | 401 or explicit 405 while writes disabled |
| SEC-02 | Forged browser user identifier | Rejected; Core derives principal from trusted assertion |
| SEC-03 | Expired/wrong-audience principal | 401, no DB mutation |
| SEC-04 | User A GET/grade user B card | 403/404, no mutation |
| SEC-05 | Replayed event ID under wrong user | Rejected or correctly scoped; no cross-user log collision |
| SEC-06 | Browser response and bundle inspection | No service token, DB URL, auth cookie contents |
| SEC-07 | Cross-site cookie-authenticated POST | CSRF defense rejects |
| SEC-08 | Core unavailable | 503/502 and UI pending/error, never success |
| SEC-09 | Local-only BFF queried with unknown keys | Rejected after proposed query guard is integrated and tested |
| SEC-10 | Staging DB marker missing or mismatched | Core refuses readiness |
| SEC-11 | Same event ID after lost response | One review log, canonical duplicate acknowledgement |
| SEC-12 | Production export unavailable | NO-GO; no inferred data parity |

## Operator decisions still pending

Confirm single-user vs multi-user scope; choose the authenticated identity source; establish verified staging DB and separate credentials in the provider dashboard; supply an independently verified safe export process if historical parity is required. Do not place credentials or snapshots in issues, commits, or chat.

## Handoff

Phase 02 may develop offline queue, event IDs and local tests while browser POST stays disabled. It must not treat a service bearer as per-user authentication. The proposed query helper in the draft branch is not an active BFF control until integrated and tested.
