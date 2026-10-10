# KIOKUDO — KẾ HOẠCH THỰC THI 5 PHASE / TỰ ĐỘNG TIẾP TỤC MỖI GIỜ

**Nguồn điều phối duy nhất / ACTIVE MASTER:** phiên bản 10/09/2026. Phạm vi: dự án frontend/backend separation Kiokudo, gồm `egbertbritannia-cpu/kiokudo-web` và `egbertbritannia-cpu/kiokudo-core`; baseline cũ là `egbertbritannia-cpu/japanese-srs-system`. Thay thế kế hoạch 7 phase ở `docs/AUTOMATION_7_HOUR_PLAN.md`. **Tổng nội dung đặc tả của 5 phase vẫn vượt 10.000 từ**; các tài liệu cũ được gộp đầy đủ dưới các mục III của 5 tài liệu mới.

## 1. Điểm xuất phát và cách đo kết quả

Ước lượng **55/100 điểm công việc đã hoàn thành**, **45/100 điểm còn lại**. Con số 45 là trọng số lập kế hoạch, không phải thời lượng cam kết hoặc KPI đo tự động. Một lượt kích hoạt chỉ mở một phiên để thực thi **một phần việc đủ nhỏ có thể làm và kiểm chứng**. Không ép AI tự hoàn thành cả phase trong một giờ; một phase lớn như Grammar/JPD133+IELTS có thể cần các lượt sau để tiếp tục. Kế hoạch mới có **5 phase độc lập với số lượt chạy**: mỗi giờ bắt đầu bằng checkpoint, làm tiếp phase chưa hoàn thành, cập nhật tiến độ và chỉ chuyển phase khi nghiệm thu. Không cam kết thời điểm đạt 100%.

Web giữ nguyên UI/asset từ phiên bản legacy: Studio, Cards, Review, Do Bai, Culture, Conjugation, JPD133, Grammar và IELTS. Core đã có Fastify, staging-only FSRS review APIs, SQLite fixtures, read-only Grammar/IELTS contracts. Web hiện có nhiều luồng read-only/prototype và chưa được cutover. Dữ liệu học Turso production, per-user auth, offline sync/undo, full module writes, deployed real staging và production cutover vẫn chưa được chứng minh đầy đủ. Không biến “đã có route/JSX/API GET” thành “đã hoàn thành nghiệp vụ”.

## 2. Năm phase đang hoạt động

| Lượt | Phase | File thực thi duy nhất | Trọng số trên 45 | Gộp từ phase cũ |
| --- | --- | --- | ---: | --- |
| 01 | Baseline audit + Authentication/BFF | [PHASE_01_BASELINE_AUTH.md](automation/active/PHASE_01_BASELINE_AUTH.md) | 10 | 01 + 02 = 3 + 7 |
| 02 | FSRS grading + Offline queue + Undo | [PHASE_02_FSRS_OFFLINE.md](automation/active/PHASE_02_FSRS_OFFLINE.md) | 10 | 03 = 10 |
| 03 | Staging DB + Snapshot parity + Migration | [PHASE_03_DATA_PARITY.md](automation/active/PHASE_03_DATA_PARITY.md) | 8 | 04 = 8 |
| 04 | Grammar/JPD133 + IELTS + External integrations | [PHASE_04_LEARNING_MODULES.md](automation/active/PHASE_04_LEARNING_MODULES.md) | 12 | 05 + 06 = 6 + 6 |
| 05 | End-to-end, security, release readiness | [PHASE_05_E2E_RELEASE.md](automation/active/PHASE_05_E2E_RELEASE.md) | 5 | 07 = 5 |
| | **TỔNG** | | **45** | **7 → 5** |

**Lưu ý:** số điểm có thể đạt tối đa là 10+10+8+12+5, nhưng kết quả thật phải ghi `earned` theo từng acceptance criterion kèm bằng chứng. Phase 04 có trọng số lớn nhất, nên ưu tiên các vertical slice và module contract safety; không tự tuyên bố cả hai module đã đầy đủ khi chưa test.

## 3. Lịch thực thi liên tục (cập nhật 10/10/2026)

Một **recurring ChatGPT Task** được lập lịch **mỗi 1 giờ** theo giờ Việt Nam; số lần chạy **không giới hạn theo số phase**. Lịch chỉ kích hoạt một phiên xử lý; không phải một tiến trình chạy liên tục suốt cả giờ. Mỗi lượt phải đọc trước [ACTIVE_PROGRESS.md](automation/ACTIVE_PROGRESS.md) — file checkpoint giữ `CURRENT_PHASE`, `CURRENT_WORK_ITEM`, SHA/PR gần nhất, checklist đã qua, blocker và `NEXT_ACTION`. Có thể xem [RUN_LOG.md](automation/RUN_LOG.md) để nhận biết lần chạy gần nhất. Không tự khám phá lại toàn bộ repo trừ khi HEAD/đặc tả đã thay đổi hoặc cần vì một lỗi.

- Nếu Phase 01 PARTIAL, lượt sau tiếp tục Phase 01; tương tự cho Phase 02–05.
- Chỉ đánh dấu `[x]` một phase nếu **DONE_VERIFIED** theo acceptance + CI/code integration + evidence; `READY_FOR_REVIEW` chưa phải done.
- **Không chuyển phase theo giờ.** Chỉ chuyển đến phase tiếp theo sau khi status được cập nhật an toàn trên GitHub. Ngay cả khi ngoài lịch đã có công việc cục bộ P02/P03/P04, phải kiểm chứng và tích hợp sau khi gate phía trước đủ.
- Khi không có việc khả thi vì external blockers, giữ nguyên phase, ghi rõ hành động người dùng cần làm; không tạo dữ liệu giả để tăng %.
- Một recurring task có thể tiếp tục chạy sau khi hoàn thành nếu nền tảng không hỗ trợ nó tự dừng. Khi all phase DONE_VERIFIED thì thông báo người dùng tắt task, hoặc chỉ tự vô hiệu hóa nếu công cụ sẵn có và có phản hồi thành công.
- Những giờ cũ của kế hoạch `5 giờ` đã kết thúc ngày 10/10/2026 và **không còn điều khiển** các lượt mới.

## 4. Sơ đồ phụ thuộc và cổng chặn

`P01 (baseline/auth)` → `P02 (FSRS online/offline)` → `P03 (staging/schema/data)` → `P04 (learning modules)` → `P05 (E2E/release)`.

Thứ tự làm việc không hàm ý rằng all phases đã hoàn tất khi lượt trước kết thúc. Phase 02 phải chặn browser writes nếu P01 chưa verified identity. Phase 03 phải phân biệt fixture parity vs verified production export, và không tự kết nối production. Phase 04 chỉ đưa progress vào DB khi auth/FSRS/schema hợp lệ; nếu thiếu thì làm code contract/test local ở trạng thái tắt. Phase 05 phải phát hành NO-GO nếu P0/P1 gates chưa đạt, ngay cả khi khối lượng implementation rất lớn. Không có dữ liệu thực verified thì không có production-ready.

### P0 invariant (áp dụng cho mọi phase)

- Không truy cập, thay đổi hoặc migrate trực tiếp Turso production bởi agent theo lịch. Không tạo credential hay database marker trong remote DB chưa được xác minh.
- Không tự merge, triển khai, đổi domain, bật production deployment hoặc làm cutover; quyền quyết định cuối cùng thuộc người dùng.
- Không đẩy snapshot, private card history, secret/token, cookies hoặc OAuth credentials vào GitHub, logs hoặc chat.
- Không restore Add Card; không redesign JSX/CSS/assets/typography/route gốc.
- Không lưu “thành công” giả khi review/IELTS chỉ mới gửi request hoặc lưu local; không làm giả điểm band, due interval, logs hay user history.
- Không dùng anonymous browser → Core writes, không dùng shared service bearer làm identity user, không bỏ qua tenant/user scoping.
- Không đánh đồng passing pure FSRS formula tests với transactional mutation/replay/browser parity.
- Không bỏ qua idempotency stable eventId, transaction, offline retry lost-response, audit IDs and schema integrity.
- Không xóa hoặc làm lại primary IDs/history để chữa lỗi test; nếu parity fail, giữ NO-GO và metadata diff.

## 5. Hợp đồng thực thi cho mỗi lượt

1. Đọc [ACTIVE_PROGRESS.md](automation/ACTIVE_PROGRESS.md) trước; xác minh `CURRENT_PHASE` và đọc file phase tương ứng. Chỉ đọc các phần master/reports/code liên quan khi cần; so HEAD SHA mới của Web/Core với checkpoint trước để tránh lặp audit toàn repo.
2. Đặt status ban đầu từ bằng chứng hiện tại, không từ tiêu đề commit. Phân biệt `DOC_ONLY`, `CODE_IMPLEMENTED`, `TEST_VERIFIED`, `REAL_STAGING_VERIFIED`, `PRODUCTION_APPROVED`.
3. Chọn work package ưu tiên cao nhất chưa làm, phù hợp công cụ hiện có; viết hoặc sửa code/docs nếu có quyền. Với việc lớn, ưu tiên một vertical slice có test tốt thay vì nửa tá stub không chạy.
4. Với changes hai repo, đảm bảo contract và Core SHA pin trong Web. Thay đổi nên nằm trong branch/PR được review; không ép merge. Không cấu hình secrets bằng cách nhắn tin.
5. Chạy `npm run check`, `npm test`, `npm run build`, Python tests/Core integration hoặc regression test phù hợp **khi tool cho phép**, ghi tên lệnh và kết quả; nếu không chạy, đánh `NOT_EXECUTED` và nói vì sao.
6. **Bắt buộc cập nhật checkpoint** tại `docs/automation/ACTIVE_PROGRESS.md` (current phase, item, status, last SHA, blocker, next action) và thêm một dòng ở `docs/automation/RUN_LOG.md`; nếu phase DONE_VERIFIED, đánh dấu [x] ở bảng master bên dưới; ghi `docs/automation/reports/PHASE_XX_REPORT.md` khi phù hợp. Nếu GitHub từ chối ghi, nêu `CHECKPOINT_WRITE_BLOCKED` và không claim saved.
7. Báo cáo tiếng Việt: `DONE_VERIFIED`, `IMPLEMENTED_UNVERIFIED`, `BLOCKED_EXTERNAL`, `NOT_DONE`; status và `earned/possible`; SHA/PR; tests executed; next-phase handoff.

## 6. Mẫu report bắt buộc

```yaml
plan_version: 5-phase-2026-10-09
phase_id: "01|02|03|04|05"
scheduled_slot_local: "<Asia/Ho_Chi_Minh slot>"
actual_started_at: "<ISO8601 if available>"
status: "VERIFIED|PARTIAL|BLOCKED_EXTERNAL|FAILED"
web_head_before: "<exact sha>"
core_head_before: "<exact sha>"
web_head_after: "<exact sha or unchanged>"
core_head_after: "<exact sha or unchanged>"
branch_or_prs: []
acceptance_results: []
tests_executed: []
tests_not_executed: []
earned_points: 0
possible_points: 0
blockers: []
handoff: []
production_mutation_performed: false
production_cutover_authorized: false
```

Đây là **schema minh họa**, không được sao chép nguyên với dữ liệu chưa điền rồi nói phase hoàn thành.

## 7. Tiêu chí nghiệm thu cuối chuỗi

Đánh giá theo tiêu chí, không theo số giờ. `DONE` cần tương ứng với thực tế test; code chỉ nằm trong open PR thì ghi `READY_FOR_REVIEW`; integration chỉ được test synthetic thì ghi `LOCAL_STAGING_VERIFIED`, không ghi production. 100/100 yêu cầu per-user auth, review idempotent/replay, snapshot history parity, grammar/IELTS real persistence, E2E and visual parity, backup/rollback rehearsal, staging thật và user approval to cutover. Thiếu chỉ một P0 condition, release decision phải là NO-GO. Kết thúc phiên 05, ghi `FINAL_5_RUN_SUMMARY.md` kèm exact list P0 blockers, user actions và một backlog ưu tiên có evidence to close.

Phần cần người dùng: xác minh/cấp export production an toàn; tạo Turso staging riêng và cấu hình marker/secret trong dashboard; quyết định auth/provider; cấu hình Google OAuth/media nếu cần; xác nhận Vercel deploy và cutover. Hãy giữ quyền truy cập ở mức tối thiểu. Không yêu cầu key/token trực tiếp trong chat.

## 8. Nguyên tắc bảo toàn tài liệu

Các tài liệu cũ `docs/automation/PHASE_01_BASELINE.md` đến `PHASE_07_E2E_RELEASE.md` sẽ được đánh dấu **ARCHIVED (7-phase)** để giữ đường dẫn lịch sử; chúng **không phải prompt vận hành mới**. Năm file trong `docs/automation/active/` là nguồn kỹ thuật đang hoạt động và có phần kế thừa đầy đủ nội dung cũ. Nếu phát hiện xung đột giữa các mục lưu trữ và phần chỉ thị mới, áp dụng master này và Mục I của file active.

## 9. Mục tiêu tối ưu hóa và báo cáo thực tế

Kiokudo là ứng dụng học cá nhân, không cần biến thành hệ thống doanh nghiệp. Tuy vậy, vì deployment public và dữ liệu học lịch sử, cần tối thiểu một cơ chế identity và write safety vững chắc. Không lãng phí lượt chạy để thêm role management nhiều tầng, AI/LLM features không được yêu cầu hoặc redesign UI. Tránh scope creep; phát hiện chức năng nào thực sự chỉ là demo thì để nó là demo cho đến khi scope có phê duyệt. Đặt correctness trước tốc độ: mỗi lượt theo giờ chỉ thực hiện các công việc có thể kiểm chứng, không có deadline cố định cho một phase.

**Kết quả được mong đợi cuối chuỗi** là một audit trail đáng tin, code/PR có test trong khả năng, bản đồ blockers và phương án phát hành rõ ràng; production migration thực chỉ diễn ra khi có chuẩn bị và ủy quyền riêng.

## 10. CHECKLIST TIẾN ĐỘ CHẠY LẶP THEO GIỜ (LIVE, cập nhật cùng checkpoint)

**Nguồn chi tiết và trường `NEXT_ACTION` nằm ở [ACTIVE_PROGRESS.md](automation/ACTIVE_PROGRESS.md).** Bảng tick này là bản tóm tắt ở ngay trong plan theo yêu cầu. Mỗi lần một phase thật sự đạt `DONE_VERIFIED`, sửa `[ ]` thành `[x]` và thêm SHA/PR/evidence. Khi chưa đạt, luôn giữ `[ ]`.

- [ ] **P01 — Baseline + Authentication/BFF** — `PARTIAL`, **4/10 tạm tính** (Web PR #9/Core PR #6 đã merge; async scrypt + staging write BFF hiện nằm ở **Web draft PR #10**, chưa test, chưa merge; ingress throttle/staging gates vẫn thiếu).
- [ ] **P02 — FSRS + Offline + Undo** — `PARTIAL` (2/10 tạm tính). Đã viết code queue IndexedDB + Karuta UI trên **Web draft PR #10**, undo/tombstones trên **Core draft PR #8**; **chưa test/merge, browser E2E chưa nghiệm thu**.
- [ ] **P03 — DB staging + Snapshot parity** — `PARTIAL/BLOCKED_EXTERNAL` (2/8 tạm tính). Bản vá snapshot validator đã commit trên **Core draft PR #8**, chưa test hoặc merge; chưa real staging/verified production export.
- [ ] **P04 — Grammar/JPD133 + IELTS** — `PARTIAL` (1/12 tạm tính). API + FE code đã viết trên **Core draft PR #8 / Web draft PR #10**, docs `API_ENDPOINTS.yaml` gồm 28 endpoint; chưa test/merge/schema migration/E2E; Google/media còn cần chọn provider.
- [ ] **P05 — E2E + Release gate** — `PARTIAL/BLOCKED_EXTERNAL` (1/5 tạm tính). Release NO-GO.

**Code delivery:** [Core draft PR #8](https://github.com/egbertbritannia-cpu/kiokudo-core/pull/8) + [Web draft PR #10](https://github.com/egbertbritannia-cpu/kiokudo-web/pull/10); [source handoff](automation/reports/CODE_DELIVERY_P01_P04_20261010.md). `CODE_WRITTEN_UNTESTED` — viết code không đồng nghĩa nghiệm thu phase, không tăng %.

**Current phase: P01.** Tổng kiểm toán lại **10/45 điểm kế hoạch tạm tính** (= P01 4 + P02 2 + P03 2 + P04 1 + P05 1); cộng baseline lịch sử 55/100 thành **~65/100 ước lượng quản lý**, **không phải tỷ lệ code đã nghiệm thu hay production readiness**. **0/5 phase DONE_VERIFIED**. Chi tiết chứng cứ: [code-flow audit 10/10/2026](automation/reports/CODE_LOGIC_PROGRESS_AUDIT_20261010.md) và [ACTIVE_PROGRESS](automation/ACTIVE_PROGRESS.md). **Không tự merge hoặc deploy, không chạm Turso production.**

### Điều kiện bàn giao một lần chạy

Mỗi lượt lưu: `last_run_at`, `current_phase`, `work_item`, `last_verified_SHAs`, `done_now`, `test_evidence`, `blockers`, `next_action`; không scan lại phần không thay đổi. Nếu bị chặn việc ghi checkpoint, báo lỗi và tạo bản trạng thái thay thế để đối chiếu, không tuyên bố đã cập nhật GitHub. Việc tắt recurring task khi DONE cần được xác nhận thực tế.
