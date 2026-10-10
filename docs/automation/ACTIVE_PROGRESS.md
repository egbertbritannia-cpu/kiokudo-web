# Kiokudo — ACTIVE_PROGRESS (Checkpoint cho mỗi lượt chạy theo giờ)

> **Nguồn trạng thái duy nhất cho automation Kiokudo.** Cập nhật khởi tạo: **2026-10-10 07:41 (Asia/Ho_Chi_Minh)**. File này thay thế quy tắc cũ “mỗi lượt đổi phase”. Dùng [Master plan](../AUTOMATION_5_HOUR_PLAN.md) để xem phạm vi và [Run log](RUN_LOG.md) để đọc nhật ký chi tiết. **Mỗi lượt đọc file này trước tiên**, không đọc lại toàn bộ repo nếu HEAD và các dependency không đổi.

## Current checkpoint (đọc phần này trước)

- **CURRENT_PHASE:** `01`
- **CURRENT_WORK_ITEM:** `P01-AUTH-OPERATOR-CONFIG-REVIEW`
- **PHASE_01_STATUS:** `PARTIAL / TEST_VERIFIED_ON_BRANCH`
- **LAST_SCHEDULED_RUN:** `NOT_YET_STARTED`
- **LAST_VERIFIED_PROGRESS_CHANGE:** `2026-10-10 ~08:22 +07` — real GitHub Actions PASS for both PR branches using synthetic isolated staging, NOT real staging certification.
- **WEB_MAIN_HEAD_LAST_REPORTED:** `2e133016b1e5bbe44378f6620b5c04ad00585fac` — xác minh GitHub main trước PR #9; thay đổi BFF nằm trên branch riêng, chưa merge.
- **CORE_MAIN_HEAD_LAST_REPORTED:** `67682872d78f37559e4c9e9d109c5c8320d418c1` — xác minh GitHub main, không đổi trong lần coding thủ công.
- **LEGACY_REFERENCE_PIN:** `3348f4ee49c9539fb9ea60c96e42833811c325ca` — chỉ đối chiếu read-only.
- **NEXT_ACTION:** [Phase 01 test evidence](reports/PHASE_01_TEST_REPORT_20261010.md) confirms [Web CI run 38012855155](https://github.com/egbertbritannia-cpu/kiokudo-web/actions/runs/38012855155) and [Core CI run 38012513903](https://github.com/egbertbritannia-cpu/kiokudo-core/actions/runs/38012513903) SUCCESS with local synthetic fixtures. Review **both draft PRs together**, provision actual staging-only secrets in protected settings, verify single-owner data provenance and signed principal on real staging, arrange infrastructure rate limiting for public password login, then run approved staged security/E2E/visual checks. Do NOT auto-merge/deploy, touch production, or enable browser review writes. Phase 01 remains PARTIAL until external acceptance.
- **LAST_COMMIT_OR_PR_FOR_CHECKPOINT:** [Web PR #9](https://github.com/egbertbritannia-cpu/kiokudo-web/pull/9) head `674f089fe9585823725c039fab09daeed7d76bf3` (13 P01 tests, 23 all Web tests, typecheck/build and fixture two-server smoke PASS); [Core PR #6](https://github.com/egbertbritannia-cpu/kiokudo-core/pull/6) head `6a7530dee4ecb1ab8e3ecc80dbf3c86f19e4c894` (4 P01 tests, 26 Node tests, 14 Python tests, typecheck/build PASS). Tests executed by GitHub Actions, no local checkout; both branches unmerged.
- **BLOCKER_NOW:** fixture CI PASS but no real staging deployment/owner provenance. Operator must configure owner subject, password digest, HMAC secrets, trusted HTTPS public and Core staging hosts and explicit single-owner dataset ACK only after verification. Public login needs infra-level rate limiting. Existing data has no multi-user owner columns; two Draft PRs unmerged. Release NO_GO.
- **RELEASE_GATE:** `NO_GO`
- **ALL_PHASES_DONE:** `false`
- **PRODUCTION_CHANGED_BY_AUTOMATION:** `false`

- **LAST_MANUAL_IMPLEMENTATION:** `2026-10-10 ~08:09 +07` — Web PR #9 + Core PR #6 code-only; not a scheduled run; 0 tests run.

## Phase 01 automated tests (2026-10-10)

- [Test report](reports/PHASE_01_TEST_REPORT_20261010.md) records 13/13 Web dedicated security tests, 23/23 Web full tests, 4/4 Core dedicated security tests, 26/26 Core Node full tests, 14 Python tests and real two-server synthetic smoke. GitHub Actions logs and exact branch SHAs linked there.
- **All tests passed on feature branches only.** No real production/staging DB accessed. Keep checkpoint in P01 and release NO_GO until operator-approved staging ownership/provenance and security acceptance.

## New evidence (manual code delivery, 10/10/2026)

- [Web Phase 01 implementation, Draft PR #9](https://github.com/egbertbritannia-cpu/kiokudo-web/pull/9) and [Core owner guard, Draft PR #6](https://github.com/egbertbritannia-cpu/kiokudo-core/pull/6). Branch-only commits, no tests/typecheck/build by explicit request.
- Existing 2/10 Phase 01 points are **not increased**: full auth acceptance has not been demonstrated, staging has not been configured; all phases remain unchecked, release NO-GO.

## Phase status — đánh dấu thật, không đánh dấu theo giờ

| Phase | Tick | Status | Ước lượng cũ (KHÔNG tự động tính là code đã tích hợp) | Điều kiện để tick |
| --- | --- | --- | --- | --- |
| 01 Baseline + Auth/BFF | [ ] | PARTIAL / TEST_VERIFIED_BRANCH | 2/10 | Principal/owner isolation + BFF negative tests + code/CI verified |
| 02 FSRS/offline/undo | [ ] | PARTIAL | 2/10 | IndexedDB persistence, replay, canonical ack, safe undo, integrated tests |
| 03 DB parity/migration | [ ] | PARTIAL / BLOCKED_EXTERNAL | 2/8 | Patch merged/CI + isolated staging + provenance + verified parity |
| 04 Grammar/JPD133+IELTS | [ ] | PARTIAL | 1/12 | Stable mapping, authenticated persistence, module integration/E2E |
| 05 E2E/release | [ ] | PARTIAL / BLOCKED_EXTERNAL | 1/5 | E2E/security/visual/rollback checks, real staging, explicit release decision |
| **Tổng** | | **Không phase nào DONE_VERIFIED** | **8/45 tạm tính** | **Điểm này không chứng minh production readiness** |

## Bằng chứng cũ và tình trạng tích hợp (không tự động suy ra đã merge)

- Phase 01 report cũ: [P01 branch trước](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/agent/kiokudo-p01-bff-query-guard-20261010/docs/automation/reports/PHASE_01_REPORT.md). **Bổ sung thủ công 10/10:** [Draft PR #9](https://github.com/egbertbritannia-cpu/kiokudo-web/pull/9) đã wire read-only policy vào BFF route thật và guard query/path, code trên branch mới chưa merge; tests/typecheck/build **NOT_EXECUTED theo yêu cầu người dùng**. No verified user principal, browser writes remain disabled.
- Phase 02 report: [P02 on branch](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/agent/kiokudo-p02-outbox-20261010/docs/automation/reports/PHASE_02_REPORT.md). Unit tests 10/10 reported PASS cục bộ; pure outbox branch `agent/kiokudo-p02-outbox-20261010`; IndexedDB adapter chưa commit; UI chưa tích hợp, no Core authenticated writes.
- Phase 03: bản vá snapshot validator và regression tests 32/32 PASS **theo báo cáo lượt trước trên bản vá cục bộ**; branch Core `agent/kiokudo-p03-snapshot-guards-20261010` có thể chưa khác `main`; cần kiểm tra trước khi tạo PR. Không có real production snapshot/staging verification.
- Phase 04: JPD133/IELTS contract 18/18 PASS **cục bộ theo báo cáo trước**; branch `agent/kiokudo-p04-domain-contracts-20261010` chưa xác minh code committed. Không có confirmed Grammar/IELTS persistence.
- Phase 05: 10+18 tests PASS theo báo cáo trước; browser E2E, visual regression, real staging, snapshot parity **NOT_EXECUTED / BLOCKED**. Release decision `NO_GO`.
- Tài liệu ZIP cục bộ ở các lượt trước **không bảo đảm các lần chạy tự động sau có thể truy cập**; không khẳng định patch P03/P04 đã nằm trong repo nếu chưa có SHA GitHub thực.
- Baseline 55% và tăng 8 điểm là **thang ước lượng quản lý**. Không được tự nâng 63% hoặc READY_FOR_RELEASE vì một lượt chạy mới chỉ tạo tài liệu.

## Quy tắc điều phối mỗi lượt chạy (bắt buộc)

1. **Đọc file này trước**; kiểm tra `CURRENT_PHASE`, `CURRENT_WORK_ITEM`, `NEXT_ACTION`, `BLOCKER_NOW`, SHA và nhánh/PR. Đọc đúng file `docs/automation/active/PHASE_XX_*.md` cho phase hiện tại; chỉ đọc code liên quan trực tiếp và báo cáo cần thiết. Master là tham chiếu policy, không cần làm lại baseline khi HEAD không đổi.
2. Kiểm tra HEAD Web/Core thực tế. Nếu khác HEAD đã lưu, xem diff/thay đổi gần đây và điều chỉnh các kết luận bị ảnh hưởng; tránh full-repo audit lặp lại nếu không có thay đổi liên quan.
3. Nếu current phase `DONE_VERIFIED` và có bằng chứng CI/integration/điều kiện nghiệm thu, **tick** bảng này và bảng mirror trong master, đặt `CURRENT_PHASE` sang phase thấp nhất chưa DONE. Nếu chưa DONE, **giữ nguyên current phase** bất kể qua bao nhiêu giờ.
4. Mỗi lượt chọn 1–3 work items testable chưa hoàn thành; dùng branch/PR cho code, thực hiện test thực sự khả dụng. `READY_FOR_REVIEW` vẫn khác `DONE_VERIFIED` và cần người dùng review/merge trước khi được tính vào main.
5. Ghi hành động hoàn thành, đường dẫn code, exact SHA/PR, test command+exit status, accepted criteria, blockers và **NEXT_ACTION rất cụ thể** vào file này. Thêm một dòng nhật ký vào `RUN_LOG.md` có thời gian, phase, work item, evidence link, next action; mỗi lượt cần **giữ checkpoint ngắn** (không nhồi full output).
6. Commit update docs trên main, kiểm tra GitHub phản hồi commit SHA rồi mới nói trạng thái đã lưu. Nếu write action bị từ chối, báo `CHECKPOINT_WRITE_BLOCKED` cùng bản status để người dùng biết lượt sau sẽ cần tái đối chiếu; **không tuyên bố đã ghi plan**.
7. Khi bị `BLOCKED_EXTERNAL`, vẫn tiếp tục các mục an toàn còn làm được trong phase. Nếu không còn work item khả thi, ghi blocker + bước do người dùng thực hiện, giữ phase ở PARTIAL/BLOCKED, không giả lập action và không chuyển phase để “đạt lịch”.
8. Không truy cập/migrate Turso production; không tự merge PR, deploy, cutover, đổi secret; không fake grades/history; không bật anonymous Core writes. Giữ `NO_GO` cho tới khi real staging + security/data E2E + approval.
9. Khi tất cả phase có `DONE_VERIFIED`, ghi `ALL_PHASES_DONE: true`, tổng hợp cuối, yêu cầu tắt task lặp hoặc tự tắt **chỉ nếu công cụ tác vụ cho phép**; không được khẳng định tự tắt nếu chưa xác nhận.

### Trạng thái cho work items

`TODO` → `IN_PROGRESS` → `READY_FOR_REVIEW` → `DONE_VERIFIED`; hoặc `BLOCKED_EXTERNAL` khi cần quyết định/thiết lập quyền. `READY_FOR_REVIEW` đòi hỏi branch/PR và test evidence rõ ràng. `DONE_VERIFIED` phải thỏa acceptance và integration thực, không chỉ synthetic tests. Một phase không được tick nếu có P0 blockers dù work-items cục bộ PASS.

### Gợi ý danh sách việc P01 đang chờ

- `P01-AUTH-IDENTITY-OWNER`: implemented signed single-owner Web session and signed Core assertion, owner dataset ACK gate, no per-row ownership migration; **CODE_IMPLEMENTED_UNVERIFIED / BLOCKED_EXTERNAL (secrets, staging provenance, public brute-force controls)**.
- `P01-BFF-READ-GUARDS`: implemented strict path/query allowlist, owner cookie gate and assertion-forwarding on Web PR #9, signed SSR Grammar reads and gated HTTPS staging; **CODE_IMPLEMENTED_UNVERIFIED** (not merged, no tests).
- `P01-NEGATIVE-AUTH-TESTS`: synthetic unauthenticated, forged/expired/wrong-issuer/wrong-owner and write-disabled scenarios **PASS on GitHub Actions**. Production auth/reliability/security negative tests remain pending.
- `P01-CONTRACT-CI`: Web/Core Draft PRs and SHA-pinned cross-repo fixture smoke **PASS on CI**; real staging and merge still pending.
- `P01-ACCEPTANCE`: validate P01 AC matrix; chuyển phase 02 khi tất cả gates đạt; **TODO**.

Sau mỗi lượt, chỉ viết next actions của work item còn dang dở, không nhân bản tất cả checklists.
