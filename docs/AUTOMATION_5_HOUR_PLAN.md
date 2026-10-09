# KIOKUDO — KẾ HOẠCH THỰC THI 5 PHASE / 5 PHIÊN CÁCH NHAU 1 GIỜ

**Nguồn điều phối duy nhất / ACTIVE MASTER:** phiên bản 10/09/2026. Phạm vi: dự án frontend/backend separation Kiokudo, gồm `egbertbritannia-cpu/kiokudo-web` và `egbertbritannia-cpu/kiokudo-core`; baseline cũ là `egbertbritannia-cpu/japanese-srs-system`. Thay thế kế hoạch 7 phase ở `docs/AUTOMATION_7_HOUR_PLAN.md`. **Tổng nội dung đặc tả của 5 phase vẫn vượt 10.000 từ**; các tài liệu cũ được gộp đầy đủ dưới các mục III của 5 tài liệu mới.

## 1. Điểm xuất phát và cách đo kết quả

Ước lượng **55/100 điểm công việc đã hoàn thành**, **45/100 điểm còn lại**. Con số 45 là trọng số lập kế hoạch, không phải thời lượng cam kết hoặc KPI đo tự động. Một lượt kích hoạt chỉ mở một phiên để thực thi **một phần việc đủ nhỏ có thể làm và kiểm chứng**. Không ép AI tự hoàn thành cả phase trong một giờ; một phase lớn như Grammar/JPD133+IELTS có thể cần các lượt sau để tiếp tục. Kế hoạch 5 phiên bảo đảm chuỗi hành động có thứ tự, không cam kết đạt 100 sau giờ thứ năm.

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

## 3. Lịch thực thi và giới hạn tài khoản

Lịch mục tiêu theo múi giờ Việt Nam (Asia/Ho_Chi_Minh), có thể đổi nếu người dùng yêu cầu:
- **00:14 ngày 10/10/2026**: lượt 01, baseline + Auth.
- **01:14 ngày 10/10/2026**: lượt 02, FSRS/offline.
- **02:14 ngày 10/10/2026**: lượt 03, data parity.
- **03:14 ngày 10/10/2026**: lượt 04, Grammar/JPD133 + IELTS.
- **04:14 ngày 10/10/2026**: lượt 05, E2E + readiness.

Hệ thống ChatGPT chỉ cho phép tối đa 5 tác vụ đang hoạt động trên tài khoản tại thời điểm lập kế hoạch; đã có một tác vụ SERF riêng không được sửa. Do đó, thay vì cố tạo thêm một task và gặp giới hạn, lịch Kiokudo sử dụng **bốn tác vụ hoạt động cho năm lượt chạy**: task số 4 có lịch lặp chính xác hai lần liên tiếp; trong lần đầu xử lý phase 04 và lần thứ hai phase 05. Phải nhận dạng phase theo thời điểm lịch được ấn định, không suy đoán “phase tiếp theo” từ trạng thái báo cáo, vì retry hoặc phase trước bị blocker có thể thay đổi tiến độ. Giữ mỗi báo cáo có `phase_id` và timestamp độc lập.

Nếu tác vụ nhận báo cáo chạy khác thời gian định trước, vẫn phải xác định phase từ slot scheduling rõ ràng. Nếu không thể xác định lần chạy của task kép, **dừng thay đổi code** và báo ambiguity, không làm nhầm release gate thành implementation phase. Các lịch không cho phép agent bypass quyền hạ tầng: cần quyền GitHub hoặc runtime thích hợp để làm code; không có quyền thì báo blocker trung thực.

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

1. Đọc FULL tài liệu master này và file phase được chỉ định. Đọc `docs/MIGRATION.md` của Web/Core và report lượt trước nếu có. Chụp lại HEAD SHA các repo.
2. Đặt status ban đầu từ bằng chứng hiện tại, không từ tiêu đề commit. Phân biệt `DOC_ONLY`, `CODE_IMPLEMENTED`, `TEST_VERIFIED`, `REAL_STAGING_VERIFIED`, `PRODUCTION_APPROVED`.
3. Chọn work package ưu tiên cao nhất chưa làm, phù hợp công cụ hiện có; viết hoặc sửa code/docs nếu có quyền. Với việc lớn, ưu tiên một vertical slice có test tốt thay vì nửa tá stub không chạy.
4. Với changes hai repo, đảm bảo contract và Core SHA pin trong Web. Thay đổi nên nằm trong branch/PR được review; không ép merge. Không cấu hình secrets bằng cách nhắn tin.
5. Chạy `npm run check`, `npm test`, `npm run build`, Python tests/Core integration hoặc regression test phù hợp **khi tool cho phép**, ghi tên lệnh và kết quả; nếu không chạy, đánh `NOT_EXECUTED` và nói vì sao.
6. Cập nhật `docs/automation/reports/PHASE_XX_REPORT.md` hoặc báo cáo kết quả trực tiếp khi write access không sẵn. Không điền số PASS/100% mà không có chứng cứ.
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

Kiokudo là ứng dụng học cá nhân, không cần biến thành hệ thống doanh nghiệp. Tuy vậy, vì deployment public và dữ liệu học lịch sử, cần tối thiểu một cơ chế identity và write safety vững chắc. Không lãng phí lượt chạy để thêm role management nhiều tầng, AI/LLM features không được yêu cầu hoặc redesign UI. Tránh scope creep; phát hiện chức năng nào thực sự chỉ là demo thì để nó là demo cho đến khi scope có phê duyệt. Đặt correctness trước tốc độ: 5 lượt chạy là lịch lấy mẫu thực thi có kiểm chứng, không phải deadline ép bỏ qua an toàn.

**Kết quả được mong đợi cuối chuỗi** là một audit trail đáng tin, code/PR có test trong khả năng, bản đồ blockers và phương án phát hành rõ ràng; production migration thực chỉ diễn ra khi có chuẩn bị và ủy quyền riêng.