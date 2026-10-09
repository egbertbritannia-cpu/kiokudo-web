# Phase 01 — Baseline, kiểm kê sản phẩm, test contract và khóa rủi ro

**Trọng số:** 3/45 điểm còn lại. **Phiên:** lượt hẹn thứ 1. **Đầu vào:** master plan, HEAD của `kiokudo-web`, `kiokudo-core`, baseline legacy `japanese-srs-system` tại commit `3348f4ee49c9539fb9ea60c96e42833811c325ca`. **Kết quả bắt buộc:** `docs/automation/reports/PHASE_01_REPORT.md` hoặc báo cáo tương đương nếu GitHub write chưa sẵn sàng. Đây là lượt tạo cơ sở sự thật cho sáu lượt sau, không phải cơ hội viết lại kiến trúc.

## 1. Câu hỏi chính của phase

Những phần nào thực sự đã tồn tại ở code và đã được test? Lộ trình tách Web/Core hiện tại có giữ đúng các tính năng đang chạy ở legacy hay chỉ giữ giao diện mẫu? Những ràng buộc nào thực sự bảo vệ production? Những test hiện có chứng minh điều gì, và điều gì vẫn chưa được test? Không thể xử lý 45% còn lại nếu ma trận hiện trạng không phân biệt demo, read-only, staging fixture, real staging và live production.

Bắt đầu bằng fetch HEAD commit và so sánh với mốc tài liệu 09/10. Đọc root README, `docs/MIGRATION.md`, `docs/PHASE4_UI_FIDELITY.md`, `docs/PHASE4B_GRAMMAR_IELTS.md`, Core `docs/DB_SNAPSHOT_PARITY.md`, `docs/FSRS_PARITY_SCOPE.md`, `docs/PHASE4B_READ_API.md`, `contracts/openapi.yaml`, package scripts, current GitHub workflows. Kiểm tra các đường dẫn thực tế thay vì giả định cách tổ chức source; khi cần tìm module, dùng repository code search. Đối chiếu với legacy chứ không chỉ đối chiếu giữa hai repo mới.

## 2. Work package 1 — Thu thập bằng chứng trạng thái

Xây bảng `route → UI source → API dependencies → persistence → auth boundary → fixture/production → tests → status` cho ít nhất Studio, Cards, Review, Dò Bài, Culture, Conjugation, JPD133 catalog/slots, Grammar catalog/lesson/practice, IELTS dashboard/session/review, Add Card decommissioned. Các cột status hợp lệ: `PROTOTYPE_ONLY`, `READ_ONLY_STAGING`, `WRITE_TESTED_LOCAL`, `STAGING_VERIFIED`, `PRODUCTION_LEGACY`, `BLOCKED`. Một trang được render không có nghĩa feature hoạt động.

Đối với backend, lập `HTTP method/path → auth gate → data source → mutation semantics → transaction boundary → error states → test coverage`. Tách FSRS `calculateReviewTransition` thuần khỏi service mutation và khỏi replay qua mạng. Xác nhận liệu API `POST /reviews` được chỉ dùng bởi test hay Web thật; phân tích liệu `POST /reviews/batch` có đảm bảo duplicate event ID, ordering và failure atomicity. Xác định có endpoint cho Grammar synthetic cards không và liệu nó có bị cố tình vô hiệu hóa. Xác định IELTS read contracts đang trả dữ liệu thật hay empty state.

Lập danh mục tất cả DB table có trong schema và tất cả table API mới thực sự dùng. Đánh dấu chỗ snapshot parity cần kiểm tra `cards`, `review_logs`, scheduler metadata, decks, Grammar/IELTS/JPD133, foreign keys, indexes, triggers/views, migration history, bảng staging marker. Không được in bản ghi chứa thông tin người học vào report; chỉ ghi tên bảng, số lượng mẫu giả hoặc thông tin aggregate không nhạy cảm.

## 3. Work package 2 — Kiểm thử baseline có thể lặp lại

Xem Node engine yêu cầu; nếu môi trường hỗ trợ `node >=22`, ở từng repo chạy `npm ci` khi lockfile hiện hữu, `npm run check`, `npm test`, `npm run build`. Với Core chạy `python3 -m unittest discover -s tests_py -p 'test_*.py' -v` khi có runtime. Không dùng `npm install` để ngầm sửa lockfile nếu chỉ kiểm kê. Ghi mã exit, test count, thời gian không cần giả định, mô tả lỗi nếu phụ thuộc chưa sẵn sàng. Nếu không được phép chạy code bằng tools đang có, phải đánh dấu `NOT_EXECUTED`, không được suy từ CI workflow rằng tất cả pass.

Đánh giá khả năng thực thi smoke cross-repo theo mốc pin của Web. Đọc workflow `.github/workflows/*`, xem artifact/download Core commit, static import đường dẫn, fixture marker và contract tests. Kiểm tra workflow có lộ secret, có tự trigger production deploy hay cấp Turso production scope không. Chỉ chứng nhận smoke khi có log kết quả. Nếu lấy CI từ GitHub mà thiếu quyền, ghi `EVIDENCE_UNAVAILABLE`; có thể tạo PR yêu cầu workflow tốt hơn trong giới hạn an toàn.

Thiết kế một `minimum executable evidence suite` cho phase sau: auth-negative, user-isolation, same-event retry, lost response, offline queue reboot, out-of-order replay, JPD133 ID preservation, Grammar practice no fake save, IELTS empty states, visual screenshot width matrix, snapshot parity positive/negative. Chưa cần viết tất cả test ngay; phải có test name, expected result và repo owner. Không chấp nhận tiêu chí “app mở được” thay cho correctness.

## 4. Work package 3 — Khóa các bất biến

Ghi 12 invariants không được vi phạm: UI fidelity byte-level cho assets quan trọng; Add Card disabled; no production mutation; no browser Core secret; no public BFF bypass; no fake FSRS event; no fake IELTS score; preserve review/card IDs; replay idempotency; stage marker and database provenance; no automatic schema DDL against production; all backend writes authorized for a specific user. Với mỗi invariant, nêu source of enforcement, negative test và cách kiểm tra; nơi chưa có enforcement cần tạo issue/PR cho phase cụ thể.

Khóa phạm vi UI: không tạo trang dashboard mới, không đổi theme từ washi/woodblock, không xóa legacy prototype theo cảm tính. Giữ distinction: giao diện preserved không đồng nghĩa feature parity. Mọi refactor có ảnh hưởng JSX/CSS phải qua source/hash test và screenshot suite ở cuối kế hoạch.

Tạo phân loại rủi ro: `CRITICAL` cho lộ production credential/mutation sai tenant/mất history; `HIGH` cho double review/duplicate submission/mismatch FSRS; `MEDIUM` cho demo hiển thị như dữ liệu thực hoặc màn hình trống không giải thích; `LOW` cho docs drift. Gắn mỗi risk với phase khắc phục và phép chứng minh giảm rủi ro, tránh suy luận “đã xử lý” chỉ vì có exception handler.

## 5. Work package 4 — Hợp đồng bàn giao và metric

Định nghĩa `Definition of Ready` cho Phase 02: biết các route Web gửi Core, biết Core bearer auth hiện tại, biết user identity contract ở legacy, biết file quản lý server env và browser env, biết các endpoint POST hiện hành. Nếu chưa biết identity provider, vẫn có thể viết thiết kế auth-neutral và negative tests, nhưng không thể kết luận production auth sẵn sàng. Đưa các câu hỏi cần người dùng quyết định vào `APPROVALS_REQUIRED`.

Định nghĩa `Definition of Done` của phase 01: bảng route/API đủ danh mục, map phase dependencies, test baseline có kết quả hoặc lý do không thực thi, invariants có owner, report có SHA chính xác, những sai lệch tài liệu được đánh dấu. Cả ba điểm progress chỉ cộng khi các bằng chứng này được đăng và liên kết. Có thể hoàn tất 1 hoặc 2 điểm nếu thiếu logs, nhưng không được đánh dấu 3/3 bằng ước lượng cảm tính.

## 6. Kịch bản thực thi ưu tiên

Thứ tự hoạt động phù hợp một phiên ngắn: đọc HEAD và tài liệu; kiểm kê sơ bộ; chạy kiểm thử không đụng production; đối chiếu routes/tables; viết report; nếu còn khả năng thì tạo một PR docs-only cập nhật status matrix. Không thay đổi DB migration hoặc auth implementation trong phase 01 trừ khi vá bug cực kỳ hẹp được test và không ảnh hưởng production. Thận trọng với việc tạo nhiều bảng tài liệu làm mờ nội dung: ưu tiên ma trận súc tích nhưng có link code và kiểm chứng.

Một ví dụ kiểm tra status sai là: README bảo “Phase 4B done”, dashboard IELTS đã render, nhưng staging local chưa có bảng IELTS; trường hợp này status là `READ_ONLY_STAGING + NEEDS_DB_FIXTURE`, không phải `END_TO_END_COMPLETE`. Trường hợp tương tự: Core có `POST /reviews`, nhưng FE vẫn disable grade; status là `BACKEND_WRITE_READY_LOCAL / FRONTEND_NOT_CONNECTED`.

## 7. Mẫu báo cáo cuối phiên

```yaml
phase_id: "01"
status: "PARTIAL | VERIFIED | BLOCKED_EXTERNAL | FAILED"
web_head_before: "<sha>"
core_head_before: "<sha>"
legacy_baseline: "3348f4ee..."
routes_audited: 0
api_contracts_audited: 0
checks:
  web_typecheck: "PASS|FAIL|NOT_EXECUTED"
  web_tests: "PASS|FAIL|NOT_EXECUTED"
  web_build: "PASS|FAIL|NOT_EXECUTED"
  core_typecheck: "PASS|FAIL|NOT_EXECUTED"
  core_tests: "PASS|FAIL|NOT_EXECUTED"
  core_build: "PASS|FAIL|NOT_EXECUTED"
  core_python_tests: "PASS|FAIL|NOT_EXECUTED"
acceptance:
  baseline_matrix: "PASS|PARTIAL|FAIL"
  negative_gate_map: "PASS|PARTIAL|FAIL"
  evidence_links: "PASS|PARTIAL|FAIL"
handoff:
  phase_02_ready: false
  blockers: []
```

Không copy nguyên mẫu với giá trị giả vào báo cáo chính thức. Điền dữ liệu thật, nêu rõ lệnh đã chạy và output rút gọn. Nếu GitHub tools không thể ghi report, giữ cấu trúc này trong phản hồi tác vụ và chỉ rõ không commit được.

## 8. Exit criteria và chính sách thất bại

Exit **PASS** khi baseline được đóng băng bằng commit SHA, route/API/test matrix và risk gate có bằng chứng, không có sai lệch chưa phân loại nghiêm trọng. Exit **PARTIAL** nếu ma trận tồn tại nhưng test không chạy hoặc một số module chưa được kiểm kê; Phase 02 phải tự kiểm các dependencies trực tiếp. Exit **BLOCKED** nếu không đọc được repo, thiếu quyền cần thiết; báo chính xác công cụ/đường dẫn. Exit **FAIL** nếu một hành động làm thay đổi production hoặc gây nguy cơ mất dữ liệu; dừng các write và đề xuất khôi phục có phê duyệt.

**Điều cấm vượt qua:** không bật grading ở Web để “kiểm tra nhanh”, không kết nối Turso production, không sử dụng credential thuộc legacy Vercel để đoán giá trị cấu hình, không thay fixture thành pseudo-production. Chất lượng phase 01 đo bằng độ tin cậy của bằng chứng cho sáu phase tiếp theo, không bằng lượng code được viết.
