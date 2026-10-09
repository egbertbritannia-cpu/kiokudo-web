# KIokudo — Kế hoạch triển khai 7 phiên tự động cho 45% công việc còn lại

> Phiên bản kế hoạch: 2026-10-09. Nguồn chuẩn của kế hoạch này là nhánh `main` của `egbertbritannia-cpu/kiokudo-web`. Repository backend: `egbertbritannia-cpu/kiokudo-core`; hệ thống production hiện hữu: `egbertbritannia-cpu/japanese-srs-system`. Mọi phiên tự động phải đọc lại chính tài liệu này, tài liệu phase tương ứng, HEAD của cả hai repository mới và kết quả phase trước trước khi sửa bất kỳ dòng code nào.

## 0. Mục đích và giới hạn cam kết

Người dùng muốn triển khai bảy phiên theo lịch, mỗi phiên cách phiên tiếp theo một giờ, để xử lý có hệ thống phần việc còn lại sau khi tách kiến trúc frontend/backend. Đây là **bảy lượt thực thi có giới hạn**, không phải cam kết rằng một AI có thể hoàn tất một phase lớn hoặc hoàn tất toàn bộ dự án trong đúng một giờ. Mỗi lượt phải tạo ra đầu ra kiểm chứng được ngay cả khi không thể hoàn thành đầy đủ: tối thiểu là baseline, bằng chứng kiểm thử, nhánh/PR nếu có sửa code, và biên bản bàn giao gắn với commit SHA. Không báo cáo hoàn thành khi thiếu bằng chứng. Trạng thái ban đầu “xấp xỉ 55% đã hoàn thành, 45% còn lại” là **ước lượng chuyên gia từ trạng thái tài liệu ngày 09/10**, không phải số đo tự động. Tiến độ có thể giảm sau khi phát hiện vấn đề nghiêm trọng; không nâng phần trăm bằng cách đếm số file, commit hay tài liệu được tạo.

Mốc cuối thực sự là hệ thống Kiokudo có hai repo Web/Core tách biệt, vẫn giữ giao diện legacy gốc, có luồng học FSRS an toàn, có staging xác minh được, có dữ liệu thật được bảo toàn khi chuyển đổi, các luồng Grammar/JPD133/IELTS trong phạm vi sản phẩm đã chọn hoạt động đúng, có kiểm thử bảo mật và có khả năng rollback. **Không được tự coi “đã đạt 100%” chỉ vì cả bảy lịch đã chạy.** Nếu yêu cầu quyền truy cập cloud hoặc quyết định của người dùng chưa được đáp ứng, đánh dấu `BLOCKED_EXTERNAL`; chỉ làm các nhánh phát triển cục bộ, không tự tạo hoặc tưởng tượng credential.

## 1. Trạng thái ban đầu có thể kiểm chứng

Căn cứ tài liệu trong repo tại 09/10/2026: Kiokudo Web đã copy và bảo toàn Studio, Cards Library, Karuta Review, Dò Bài, Culture, Conjugation, JPD133, Grammar và IELTS; giao diện mới giữ nguyên JSX/CSS/artwork cần thiết. Cards, Grammar, IELTS có read-only staging GET contract. Backend Core có Fastify/TypeScript, libSQL/Drizzle, FSRS calculation, review POST/batch transaction, event-id idempotency, database identity guard, fixture SQLite cục bộ và offline clone rehearsal. Có CI smoke nhiều tầng; không đồng nghĩa CI đã chạy thành công ở thời điểm mỗi lượt. Web hiện **chặn thao tác ghi Review**; một số trang chỉ là prototype. Không có cam kết production data parity, authenticated per-user BFF, cloud staging thực, Grammar synthetic ID mapping, IELTS writes, full replay/undo hay production cutover. Backend README có thể chậm hơn code mới: mỗi phiên kiểm tra HEAD + nguồn code/test thay vì suy luận từ README duy nhất.

Legacy `japanese-srs-system` là ứng dụng production hiện hữu, giữ nguyên. Không được restore Add Card. Không redesign màu, font, bố cục, logo, art, route hoặc trải nghiệm nếu không có yêu cầu mới. Không được tạo điểm IELTS giả, tiến độ FSRS giả, tạo synthetic cards vô tình, hay đánh đồng fixture 316 thẻ với dữ liệu người học thực tế. Bảo vệ lịch sử review/identity là tiêu chí bắt buộc.

## 2. Cấu trúc kế hoạch và lịch trình

Từng phase có file độc lập, đủ thông tin để một phiên tự động đọc và thực thi mà không cần hồi tưởng hội thoại:

| Phiên | File | Mục tiêu nền | Đầu ra tối thiểu |
| --- | --- | --- | --- |
| 01 | [PHASE_01_BASELINE.md](automation/PHASE_01_BASELINE.md) | Khóa baseline, kiểm kê, hợp đồng test và backlog | Evidence baseline, nguy cơ, ma trận AC |
| 02 | [PHASE_02_AUTH_BFF.md](automation/PHASE_02_AUTH_BFF.md) | Per-user authorization và Web-to-Core BFF | Code/tests hoặc thiết kế fail-closed có bằng chứng |
| 03 | [PHASE_03_FSRS_OFFLINE.md](automation/PHASE_03_FSRS_OFFLINE.md) | Review write, queue offline, idempotency, undo | Vertical slice FSRS trên staging fixture |
| 04 | [PHASE_04_DATABASE_PARITY.md](automation/PHASE_04_DATABASE_PARITY.md) | Dữ liệu, snapshot parity, schema guard, migration rehearsal | Báo cáo đối chiếu và runbook không lộ dữ liệu |
| 05 | [PHASE_05_GRAMMAR_JPD133.md](automation/PHASE_05_GRAMMAR_JPD133.md) | Grammar/JPD133 real-ID và lưu tiến độ | Mapping và kiểm thử contract đúng ngữ nghĩa |
| 06 | [PHASE_06_IELTS_INTEGRATIONS.md](automation/PHASE_06_IELTS_INTEGRATIONS.md) | IELTS writes và integration adapters an toàn | Contracts, logic triển khai và test không giả số liệu |
| 07 | [PHASE_07_E2E_RELEASE.md](automation/PHASE_07_E2E_RELEASE.md) | E2E/visual/security, release readiness, rollback | Go/no-go report, không tự cutover |

Các file phase là chi tiết chuẩn; master này quy định nguyên tắc điều phối ưu tiên. Cần chạy theo thứ tự. Nếu phiên trước thất bại ở điều kiện tiên quyết, phiên sau vẫn được kích hoạt đúng giờ nhưng **phải chuyển sang audit, sửa blocker có thể xử lý an toàn, và cập nhật báo cáo**, không đi xuyên qua gate bằng bypass. Ví dụ phiên 03 không thể cho browser ghi review nếu phase 02 chưa có cơ chế chứng thực/phân quyền; phiên 04 không thể xác nhận parity dữ liệu thật khi không có snapshot đáng tin; phiên 07 không thể tuyên bố production-ready nếu rollback chưa được thử.

## 3. Quy định tác nghiệp cho mọi phiên

1. Đọc full master + phase file trước tiên. Ghi rõ đường dẫn, commit SHA, thời gian bắt đầu và phạm vi có thể thực hiện. Đọc `docs/MIGRATION.md` của cả hai repo và ít nhất một code path thực tế liên quan. Không sử dụng nội dung cached nếu HEAD thay đổi.
2. Kiểm tra chéo CI, test script, dependencies, contracts, mapping và các workflow liên quan. Phân loại mỗi nhận định thành `VERIFIED_BY_CODE`, `VERIFIED_BY_TEST`, `DOC_ONLY`, `UNVERIFIED`, `BLOCKED_EXTERNAL`. Mọi tỷ lệ hoàn tất gắn tiêu chí, không gắn số lượng commit.
3. Ưu tiên giới hạn blast radius: mỗi lượt một nhánh riêng tên `agent/kiokudo-pXX-YYYYMMDD` nếu có hỗ trợ; PR riêng từng repo; thay đổi scope vừa đủ; không merge tự động; không xóa database, không thay credentials, không sửa workflow chạy trên production. Việc đặt nhánh có thể được điều chỉnh để tránh trùng tên.
4. Tuân theo least privilege. Không gửi key, token, cookie, snapshot thô hay thông tin riêng tư vào issue/PR/log/chat. Secrets phải nằm trong secret manager của môi trường; không cố thu thập credential người dùng. Không truy cập production Turso hoặc bật viết vào production.
5. Đọc và thực thi lệnh kiểm thử khả dụng. Tối thiểu cân nhắc `npm run check`, `npm test`, `npm run build` từng repo, kiểm thử Python trong Core và cross-repo smoke; mô tả chính xác lệnh đã chạy và kết quả. Không nói “pass” nếu chỉ nhìn thấy script trong package.json.
6. Khi cần sửa FE/BE đồng bộ, ghi rõ pin SHA Core trong Web; không đổi hợp đồng ngầm. OpenAPI/schema là nguồn kiểm tra giao diện; migrations phải tương thích. Nếu không đủ thời gian hoặc bối cảnh, ưu tiên slice nhỏ đi hết test trước hơn thay đổi rộng không chứng minh được.
7. Mọi thay đổi hành vi người dùng phải fail closed: không tạo lịch sử giả, không nuốt lỗi network rồi toast thành công, không double-review, không làm mất offline queue, không quên user scoping, không vẽ lại giao diện cũ.
8. Mỗi phiên phải cập nhật một biên bản `docs/automation/reports/PHASE_XX_REPORT.md` (nếu quyền GitHub cho phép), chứa HEAD đầu/cuối, branch/PR, kiểm thử đã thực sự chạy, kết quả, blocker, rủi ro, quyết định, next phase contract. Nếu không thể ghi GitHub, xuất báo cáo ngay trong kết quả tác vụ và nêu lỗi công cụ.
9. Không báo cáo tiến độ phần trăm mới trừ khi có ma trận tiêu chí nghiệm thu. Nếu thất bại, đánh dấu `PARTIAL` hoặc `BLOCKED` với lý do; khuyến nghị hành động người dùng cụ thể, không tạo kết quả hoàn tất giả.
10. Nếu phiên đang chạy lại cùng phase, dùng checkpoint và `idempotency key` từ phase report; kiểm tra PR/branch hiện có trước khi tạo; tuyệt đối không ghi đè thay đổi ngoài phạm vi của một phiên khác.

## 4. Phân bổ 45 điểm tiến độ còn lại

Đây là **trọng số quản lý công việc**, không phải xác suất hoàn thành trong giờ đó: Phase 01 = 3 điểm; Phase 02 = 7 điểm; Phase 03 = 10 điểm; Phase 04 = 8 điểm; Phase 05 = 6 điểm; Phase 06 = 6 điểm; Phase 07 = 5 điểm. Tổng 45. Chỉ cộng điểm khi các acceptance criteria trong file phase được chứng minh; nếu phase có nhiều AC, có thể cộng từng phần dựa trên bằng chứng. Không cộng điểm chỉ vì tạo được checklist. Mốc 100/100 chỉ là khả năng xảy ra sau khi hoàn thành gates; thiếu hạ tầng cloud, OAuth hoặc production snapshots thì 100 bị chặn một cách có chủ ý.

Hàng đợi ưu tiên: P0 dữ liệu và an toàn, P1 authenticating/FSRS đúng, P2 parity các modules và visual, P3 integrations phụ thuộc external. P0 có quyền chặn P1/P2. Ngoài phần trăm, phân tách `implementation completion`, `verified staging readiness` và `production authorization` thành ba trạng thái độc lập.

## 5. Hợp đồng dữ liệu trạng thái và dependency graph

Mọi report có fields:
`phase_id`, `run_at`, `repo_heads_before`, `repo_heads_after`, `previous_phase_report`, `status`, `scope_attempted`, `files_changed`, `tests_run`, `tests_not_run`, `acceptance_results`, `blockers`, `risk_rating`, `next_phase_inputs`, `approvals_required`, `links`.

Status: `NOT_STARTED`, `IN_PROGRESS`, `PARTIAL`, `VERIFIED`, `BLOCKED_EXTERNAL`, `FAILED`. `VERIFIED` yêu cầu có bằng chứng test và review; `PARTIAL` khi hoàn thành một phần nhưng thiếu chốt; `BLOCKED_EXTERNAL` khi chỉ thiếu credential/permission/snapshot/phê duyệt mà không có cách an toàn để vượt qua; `FAILED` khi có lỗi không thể xử lý trong phạm vi phiên. Không lấy độ dài báo cáo làm thước đo.

Graph tổng quát: 01 → 02 → 03; 01 → 04; 02+03+04 → 05; 02+04 → 06; 02+03+04+05+06 → 07. Lịch một giờ là lịch đánh thức tác vụ, **không phải deadline cứng ép bỏ qua dependency**. Nếu 01 chưa có baseline, 02 phải tự kiểm lại baseline tối thiểu, không chấp nhận HEAD mơ hồ. Nếu 04 cần snapshot production nhưng không có, tiếp tục xây audit tools bằng fixtures, phát hành `NO-GO` cho parity thật.

## 6. Chỉ tiêu chất lượng dùng chung

- **An toàn dữ liệu:** reviewer phải giải thích rõ cách tránh mất card ID, timestamp, FSRS stability/difficulty, review logs, counters, schema indexes, triggers/views và transaction ordering. Snapshot test phải verify independent checksum và hai cơ sở dữ liệu độc lập, không chạy trực tiếp trên production.
- **Tính đúng FSRS:** grade `Again/Hard/Good/Easy`, status `New/Learning/Review/Relearning`, idempotent event IDs, out-of-order, duplicate concurrent operations, timezone/daylight/clock skew và retry lost-response có test phù hợp. Cùng một action không tạo hai review.
- **Bảo mật:** authentication gắn từng user; BFF không lộ service token; Core không chấp nhận request không hợp lệ; CSRF, input validation, rate limit và tenant isolation phải được xem xét. Không thay riêng token Bearer dùng chung thành browser token public.
- **Tính trung thực giao diện:** giữ nguyên bố cục/phong cách gốc; screenshot comparison desktop/mobile; lỗi staging và empty states phải hiện đúng; không tạo dữ liệu giả để lấp màn hình.
- **Phát hành:** có reproducible build và smoke, release manifest gắn các SHA cùng phiên bản, health check, backup/snapshot verified, rollback rehearsal, và thủ tục manual user approval.

## 7. Quy tắc bàn giao giữa các lượt

Trước cuối mỗi phiên, ghi `Next phase input` là danh sách ngắn gọn: các SHA có thể dùng, APIs đã ổn định, DB fixture paths không nhạy cảm, lệnh test, blocker chưa xử lý, invariant không được phá, các PR cần đọc. Lượt sau phải đọc report trước nhưng không coi report là bằng chứng thay code hoặc test. Nếu có hai phiên đụng cùng file, không auto-force merge. Nếu phải tạo nhiều PR theo repo, gắn cặp PR và pin SHA chính xác.

Báo cáo cuối phiên được gửi bằng tiếng Việt, gồm ba mốc: **đã chứng minh**, **đã làm nhưng chưa chứng minh**, **chưa làm**. Không ước lượng số giờ để hoàn thành remaining implementation dựa vào tiến trình lịch; một lượt chạy có thể gặp blocker ngẫu nhiên hoặc yêu cầu đồng thuận ngoài quyền hạn.

## 8. Ma trận quyết định do người dùng kiểm soát

Người dùng không phải cấp quyền production cho coding agent. Các hành động này yêu cầu quyết định riêng: (a) export snapshot từ Turso production bằng phương pháp an toàn và kiểm tra nguồn gốc; (b) tạo Turso staging thật, cấu hình marker và secret trong provider dashboard; (c) lựa chọn phương thức auth và chính sách dữ liệu cá nhân; (d) cấp OAuth/Google tích hợp nếu thực sự muốn giữ; (e) xác nhận domain/Vercel deployment và chuyển traffic; (f) backup, rollback và go-live sign-off. Mọi task liên quan có thể chuẩn bị `operator checklist` và fail-safe code nhưng không thay quyết định người dùng bằng mặc định thuận tiện.

## 9. Định nghĩa hoàn thành toàn bộ

100/100 chỉ được công nhận khi: cả hai repo build và test; Web/Core staging hoạt động bằng dữ liệu đáng tin; FSRS end-to-end an toàn sau retry/offline/undo; dữ liệu review thực được đối chiếu checksum/row and schema; Grammar/JPD133/IELTS trong scope thực tế có parity; giao diện regression qua nhiều viewport; kiểm tra security được chứng minh; có telemetry phù hợp quyền riêng tư; rollback rehearsal thành công; người dùng phê duyệt chuyển production; sau cutover giám sát đúng và có khả năng quay lui. Việc không giữ chức năng Add Card là yêu cầu, không phải lỗi thiếu tính năng. Các chức năng RAG/AI hay mở rộng học tập chưa được user chọn scope sẽ không tự thêm vào “45%” để làm lệch lộ trình.

## 10. Prompt điều phối chuẩn cho bộ hẹn giờ

```text
Bạn đang thực thi Phase XX của kế hoạch Kiokudo theo lịch 7 phiên.
Bắt đầu bằng cách đọc FULL https://github.com/egbertbritannia-cpu/kiokudo-web/blob/main/docs/AUTOMATION_7_HOUR_PLAN.md và docs/automation/PHASE_XX_....md (đúng theo bảng mục 2).
Đọc report Phase XX-1 nếu có; truy xuất HEAD/current code và migrations của kiokudo-web và kiokudo-core; đối chiếu acceptance gates.
Chỉ thực hiện thay đổi an toàn trên branch/PR, không động production/Turso credential, không tự merge/deploy; không bypass auth hay viết điểm giả.
Thực hiện các work package của phase theo ưu tiên an toàn; chạy test có thể chạy thực sự; ghi reports/PHASE_XX_REPORT.md nếu được.
Nếu thiếu công cụ hoặc dữ liệu ngoài quyền, không suy đoán; xuất PARTIAL/BLOCKED với bằng chứng và next steps.
Trả báo cáo tiếng Việt, kèm URL commit/PR và kết quả từng acceptance criterion. Không tuyên bố 100% vì đủ 7 lượt chạy.
```

## 11. Kiểm soát lịch chạy

Bảy lịch nên được tạo dưới dạng **bảy lần chạy đơn lẻ**, mỗi lần cách nhau một giờ; tránh một lịch lặp tự suy luận số phase vì có thể chạy lại do lỗi hoặc không duy trì được state. Từng lời nhắc hẹn giờ nêu rõ Phase ID và link file cần đọc. Lịch tạo ra chỉ bảo đảm khởi động yêu cầu tác vụ theo khả năng hệ thống, không tự bảo đảm tác vụ có quyền code, có thời gian CPU đủ lâu, PR được merge, staging đã kết nối hay production được phê duyệt. Nếu task không thể tiếp tục công việc đã cam kết, phải báo blocker chứ không giả vờ đã triển khai.

## 12. Các mốc đánh giá sau phiên thứ bảy

Cần một bảng tổng hợp AC evidence của cả bảy phase. Phân biệt phần `READY_FOR_CODE_REVIEW`, `READY_FOR_STAGING`, `BLOCKED_FOR_PRODUCTION`; lấy trạng thái thấp nhất trong critical gates làm quyết định release. Danh sách chưa xong phải được ưu tiên theo severity và có chủ sở hữu, dependency, proof to close. Nếu có thể hoàn tất hơn mong đợi thì vẫn không được bỏ qua xác nhận production. Nếu hoàn thành ít hơn, số liệu phải phản ánh đúng thực tế chứ không điều chỉnh để khớp 7 giờ. 
