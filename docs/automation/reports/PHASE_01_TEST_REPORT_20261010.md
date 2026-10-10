# Kiokudo Phase 01 — Test setup & CI evidence (2026-10-10)

**Test setup:** COMPLETE on feature branches. **Code and fixture E2E:** CI VERIFIED. **Phase 01 acceptance:** PARTIAL / NOT DONE_VERIFIED (unmerged branches, no real staging owner provenance or approved deployment). **Release gate:** NO-GO.

## Tested code pins

- Web: [Draft PR #9](https://github.com/egbertbritannia-cpu/kiokudo-web/pull/9), SHA `674f089fe9585823725c039fab09daeed7d76bf3`.
- Core: [Draft PR #6](https://github.com/egbertbritannia-cpu/kiokudo-core/pull/6), SHA `6a7530dee4ecb1ab8e3ecc80dbf3c86f19e4c894`.
- **Web CI:** [GitHub Actions 38012855155](https://github.com/egbertbritannia-cpu/kiokudo-web/actions/runs/38012855155) — both `verify` and `cross-repo-staging-smoke` **SUCCESS**.
- **Core CI:** [GitHub Actions 38012513903](https://github.com/egbertbritannia-cpu/kiokudo-core/actions/runs/38012513903) — Node, Python, TypeScript, build **SUCCESS**.

## How to run

Web (Node 22, dependencies installed):

```bash
npm run test:phase1
npm test
npm run check
npm run build
```

Core (Node 22, dependencies installed):

```bash
npm run test:phase1
npm test
python3 -m unittest discover -s tests_py -p 'test_*.py' -v
npm run check
npm run build
```

Both GitHub Actions workflows execute the commands automatically for pull requests. No real database token is needed to run the tests.

## Evidence matrix

| Gate | Coverage | Evidence | Outcome |
| --- | --- | --- | --- |
| P01-AUTH-01 | scrypt, cookie signature/owner, login/logout and CSRF Origin | `web/tests/phase1-auth.test.ts` | PASS in CI |
| P01-AUTH-02 | unauthenticated BFF read; methods remain GET only | `web/tests/phase1-auth.test.ts`, `web/tests/bff-readonly.test.ts` | PASS in CI |
| P01-AUTH-03 | signed assertion method/path/scope; forged/expired/wrong owner | `core/tests/owner-authorization.test.ts`; Web signing checks | PASS in CI |
| P01-AUTH-04 | single-owner dataset ACK fail closed; denied review writes leave zero logs | `core/tests/owner-authorization.test.ts` + temporary SQLite | PASS in CI (synthetic) |
| P01-AUTH-05 | BFF route/query allowlist, traversal/control bytes, staging hostname | Web Phase 01 tests | PASS in CI |
| P01-AUTH-06 | protected learner pages, including potentially cached offline views | `web/tests/phase1-auth.test.ts` | PASS in CI |
| P01-INT-01 | login via real Next server; Web BFF signed GET → Fastify Core; Grammar/IELTS page smoke | `web/scripts/smoke-cross-repo.mjs`; Web cross-repo CI | PASS in isolated CI |
| P01-INT-02 | old review, Grammar/IELTS, snapshot and parity suites remain passing with fixtures | Web/Core full tests | PASS in CI |
| P01-DEPLOY-01 | operator-authored secrets, public hostname, real staging identity/provenance and single-owner dataset approval | requires external environment | NOT_EXECUTED |
| P01-RELEASE-01 | verified real staging, security review incl. public login rate limiting, browser E2E, merge/deploy decision | external/approval-dependent | NOT_EXECUTED |

## CI observations

- Web dedicated security suite: **13/13 tests PASS**; Web full test command: **23/23 PASS** on head SHA.
- Core dedicated security suite: **4/4 PASS**; Core full test command: **26/26 PASS**; Python **14 tests PASS** on head SHA.
- Web integration CI executes Core test suite and verifies real Web→Core HTTP path with synthetic owner login; **no anonymous writes** or production data.
- CI uses fixed, deliberately public **synthetic credentials only**, a temporary staged SQLite database and no production Turso credentials. The explicit acknowledgment flag in CI refers only to the isolated test fixture.

## Known residual risk

- These are not real staging/prod tenant-isolation tests: the current schema explicitly represents one owner, **not multi-tenant row-level ownership**.
- Public password login lacks integrated distributed rate limiting; provision infrastructure-level throttling before external exposure.
- The Web/Core changes are still on separate Draft PRs and **not merged**. Do not treat a CI fixture or green synthetic tests as operator-verified staging parity.
- Phase 01 acceptance remains PARTIAL until operator configuration, scope/provenance verification, integration review and explicit approval.

## Next action

Review and merge both PRs together after approval and re-pin compatible Core SHA in Web workflow; provision distinct staging credentials, verify staging DB identity and owner association; run authorized real staging checks and production release gates separately. Do not turn on Web review writes or cut over production as part of this test setup.
