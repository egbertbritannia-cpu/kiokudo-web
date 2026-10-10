# Kiokudo — ACTIVE_PROGRESS (Checkpoint cho mỗi lượt chạy theo giờ)

> **Nguồn trạng thái duy nhất cho automation Kiokudo.** Cập nhật khởi tạo: **2026-10-10 07:41 (Asia/Ho_Chi_Minh)**. File này thay thế quy tắc cũ “mỗi lượt đổi phase”. Dùng [Master plan](../AUTOMATION_5_HOUR_PLAN.md) để xem phạm vi và [Run log](RUN_LOG.md) để đọc nhật ký chi tiết. **Mỗi lượt đọc file này trước tiên**, không đọc lại toàn bộ repo nếu HEAD và các dependency không đổi.

## Current checkpoint (đọc phần này trước)

- **CURRENT_PHASE:** `01`
- **CURRENT_WORK_ITEM:** `P01-AUTH-IDENTITY-OWNER`
- **PHASE_01_STATUS:** `PARTIAL`
- **LAST_SCHEDULED_RUN:** `NOT_YET_STARTED`
- **LAST_VERIFIED_PROGRESS_CHANGE:** `2026-10-10 07:41 +07` (khởi tạo checkpoint, KHÔNG phải xác minh code mới).
- **WEB_MAIN_HEAD_LAST_REPORTED:** `bbed3870a48cf0e61e0d251fe6035fc6551655c2` — ghi nhận từ báo cáo P05 trước; **phải kiểm tra HEAD thực tế** trước khi code.
- **CORE_MAIN_HEAD_LAST_REPORTED:** `67682872d78f37559e4c9e9d109c5c8320d418c1` — ghi nhận trước, không phải xác nhận mới.
- **LEGACY_REFERENCE_PIN:** `3348f4ee49c9539fb9ea60c96e42833811c325ca` — chỉ đối chiếu read-only.
- **NEXT_ACTION:** kiểm tra head và các nhánh P01/P02; xác định identity principal đáng tin cậy và per-user ownership. Chọn vertical slice auth/BFF có thể chạy test mà **không bật** Review POST. Ghi code lên branch/PR, chứng minh negative tests. Nếu provider/identity quyết định bị chặn, làm testable trust-boundary/deny-by-default trong Phase 01; không chuyển phase chỉ vì hết giờ.
- **LAST_COMMIT_OR_PR_FOR_CHECKPOINT:** none; initial audit summaries below, no new code verified here.
- **BLOCKER_NOW:** thiếu authenticated learner principal, Core owner scoping; thiếu bản staging identity được xác minh và auth choice/operator configuration.
- **RELEASE_GATE:** `NO_GO`
- **ALL_PHASES_DONE:** `false`
- **PRODUCTION_CHANGED_BY_AUTOMATION:** `false`

## Phase status — đánh dấu thật, không đánh dấu theo giờ

| Phase | Tick | Status | Ước lượng cũ (KHÔNG tự động tính là code đã tích hợp) | Điều kiện để tick |
| --- | --- | --- | --- | --- |
| 01 Baseline + Auth/BFF | [ ] | PARTIAL | 2/10 | Principal/owner isolation + BFF negative tests + code/CI verified |
| 02 FSRS/offline/undo | [ ] | PARTIAL | 2/10 | IndexedDB persistence, replay, canonical ack, safe undo, integrated tests |
| 03 DB parity/migration | [ ] | PARTIAL / BLOCKED_EXTERNAL | 2/8 | Patch merged/CI + isolated staging + provenance + verified parity |
| 04 Grammar/JPD133+IELTS | [ ] | PARTIAL | 1/12 | Stable mapping, authenticated persistence, module integration/E2E |
| 05 E2E/release | [ ] | PARTIAL / BLOCKED_EXTERNAL | 1/5 | E2E/security/visual/rollback checks, real staging, explicit release decision |
| **Tổng** | | **Không phase nào DONE_VERIFIED** | **8/45 tạm tính** | **Điểm này không chứng minh production readiness** |

## Bằng chứng cũ và tình trạng tích hợp (không tự động suy ra đã merge)

- Phase 01 report: [P01 on branch](https://github.com/egbertbritannia-cpu/kiokudo-web/blob/agent/kiokudo-p01-bff-query-guard-20261010/docs/automation/reports/PHASE_01_REPORT.md). Helper BFF pure chưa wired, no verified user principal, các loại browser writes disabled. Branch `agent/kiokudo-p01-bff-query-guard-20261010`. Kiểm tra lại branch trước khi làm.
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

- `P01-AUTH-IDENTITY-OWNER`: principal nguồn đáng tin + owner scoping/deny-by-default; **IN_PROGRESS (phân tích) / BLOCKED_EXTERNAL (lựa chọn auth và staging)**.
- `P01-BFF-READ-GUARDS`: tích hợp helper vào BFF GET path, kiểm thử malformed and traversal query; **TODO**.
- `P01-NEGATIVE-AUTH-TESTS`: unauthenticated, forged user ID, cross-user card, service bearer exposure; **TODO**.
- `P01-CONTRACT-CI`: PR reviewable + Web/Core CI + exact SHA pin; **TODO**.
- `P01-ACCEPTANCE`: validate P01 AC matrix; chuyển phase 02 khi tất cả gates đạt; **TODO**.

Sau mỗi lượt, chỉ viết next actions của work item còn dang dở, không nhân bản tất cả checklists.
