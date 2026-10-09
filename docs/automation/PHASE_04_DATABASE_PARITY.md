# Phase 04 — Database staging, provenance, snapshot parity và migration rehearsal

**Trọng số:** 8/45. **Phiên:** lần chạy thứ 4. **Đầu vào:** master, baseline phase 01, event/owner model phase 02–03, tài liệu Core `DB_SNAPSHOT_PARITY` và `OFFLINE_CLONE_REHEARSAL`. **Nguyên tắc bất biến:** không truy cập hoặc sửa Turso production bằng agent; không tạo staging marker trên một DB chưa được người vận hành xác nhận danh tính; không commit raw database snapshot lên GitHub.

## 1. Phân biệt bốn môi trường

`legacy-production` là ứng dụng `japanese-srs-system` đang phục vụ người dùng; nguồn dữ liệu lịch sử phải được bảo toàn. `local-json-fixture` là 256 JPD133 + 60 N5 hoặc dữ liệu minh họa liên quan để kiểm thử cấu trúc; nguồn này không chứng minh lịch sử học thật. `isolated-local-snapshot` là một bản export SQLite checkpointed có checksum, chỉ được dùng offline sau khi người vận hành đảm bảo xuất hợp lệ và an toàn. `remote-turso-staging` phải là database tách biệt đã xác minh organization/database ID/URL, với marker riêng tư và credential scope riêng. Không dùng một biến `KIOKUDO_DATABASE_SCOPE=staging` để chứng minh đích là staging; phải có DB-resident identity plus provenance.

Báo cáo phase phải phân biệt rõ `fixture parity`, `snapshot parity`, `remote staging parity` và `live cutover parity`; bốn khái niệm có tiêu chí khác nhau. Không được nhảy từ các test fake SQLite sang kết luận remote Turso an toàn. Nếu không có snapshot thật, phase này có thể hoàn thiện audit scripts, negative tests và operator runbook, nhưng **không thể đạt dữ liệu production parity**.

## 2. Work package A — Audit schema & historical state

Đọc legacy schema code, Drizzle migrations và current Core schema; xuất ma trận table/column/default/nullable/primary key/foreign key/index/unique/trigger/view. Chú ý bảng review logs, per-user card states, due scheduling metadata, decks, Grammar synthetic cards, IELTS sessions/logs/mistakes/vocab/materials, JPD133 ID lookup, auth-related tables và `sqlite_sequence` khi có. Audit phải kiểm tra row counts cùng content hashes (dựa trên sorted canonical records) để bắt mismatch mà không in learner text, timestamp hay token.

Cần xét data type affinity của SQLite/libSQL, `NULL` vs empty string, ISO timestamp vs numeric, floating-point FSRS precision, timezone, collation và generated IDs. Một khác biệt byte-for-byte có thể là expected staging marker; exemptions phải được khai báo minh bạch, không tự thêm exemptions khi test fail. Mỗi schema mismatch phải có decision record: sửa migration, chứng minh canonical equivalence, hoặc block. Không sửa quá rộng bằng `DROP TABLE` hoặc implicit recreate.

## 3. Work package B — Snapshot provenance và guard

Đối với script `audit_snapshots.py`, kiểm tra nó chỉ nhận hai đường dẫn local, mở chế độ read-only, từ chối missing/invalid file và không ghi raw row data. Guard của `offline clone` phải yêu cầu SHA256 do người vận hành kiểm độc lập, từ chối overwrite, khước từ WAL sidecar chưa checkpointed, phát hiện missing views/triggers/indexes, và đảm bảo local-only staging marker được tạo **chỉ trên bản clone mới không có kết nối production**. Khi clone source không có full snapshot hoặc chưa checkpoint, fail và ghi lý do; không cho fallback silent.

Viết negative tests với corruption, tampered SHA, truncated SQLite, schema drift, dropped index, changed row value, missing review history, foreign-key mismatch, changed trigger, wrong staging marker và duplicate IDs. Không cần source thực để test các sai lệch này; dùng fake fixture được tạo trong temp directories. Công cụ audit không mở remote Turso URL, không dùng credentials trong code paths. Nếu script gọi `immutable=1`, đọc các giải thích đã có về checkpoint và test sidecar handling.

Một nguyên tắc quan trọng: checksum của export không tự chứng minh export đến từ production thật. Vì vậy `provenance` phải có người vận hành xác nhận nguồn, thời điểm, kỹ thuật consistent export, organization/database identity, checksum và vị trí bảo quản. Không nhập secrets hoặc metadata nhạy cảm vào repo công khai; báo cáo chỉ nhắc `operator_verified=yes/no` với reference nội bộ, không công bố file export.

## 4. Work package C — Migration rehearsal trên dữ liệu cách ly

Lập trình rehearsal cho một bản clone local độc lập: check schema; clone IDs/history preserved; verify content hashes; verify staging identity; run Core GET/cards and review POST trên **bản sao thứ cấp để test write**, không trực tiếp trên baseline clone đã đối chiếu. Sau write test, audit expected changes chính xác: chỉ một card's scheduler state và một log phù hợp, các bảng khác không thay đổi bất ngờ. Nếu mock data có linked Grammar/JPD133, test mapping ID. Nếu không có test tables, report `NOT_TESTED`, không tạo bảng tự động rồi gọi là parity.

Không import các logs có thể nhạy cảm vào CI công khai. CI dùng synthetic SQLite generated at test runtime. Với dữ liệu export thật (nếu người vận hành cung cấp), dùng local isolated executor và chỉ xuất redacted summary; không upload DB vào GitHub Actions artifact. Không truyền đường dẫn ổ đĩa máy riêng trong public report. Chỉ khi independent verification của staging instance hoàn tất mới mở network staging BFF, với flag tách biệt production và giới hạn IP/access.

## 5. Work package D — Data migration mapping và consistency

Xác định card primary IDs từ legacy được preserved như thế nào; không được chuyển `cardId` sang `fixture_*` trong production. Scheduler state `difficulty`, `stability`, `state`, `due`, `lastReview`, `reps`, `lapses`, `elapsed_days`, `scheduled_days`, custom parameters và historical logs phải so được trước/sau. Nếu Legacy schema dùng camelCase/column name khác, mapping phải explicit và reversible; không dựa trên string concatenation không có collision tests.

Đối với review events mới phát sinh giữa hai snapshots, lập cutover strategy: maintenance mode/write freeze hoặc incremental catch-up có verified high-water mark; định nghĩa xử lý in-flight and offline events, không để hai backends cùng ghi song song vào hai DB không đồng bộ. Nếu không thể giải quyết zero-downtime correctness, chọn cửa sổ bảo trì do người dùng phê duyệt, không hy sinh integrity. Phải có nguyên tắc replay source-of-truth và rollback boundary: dữ liệu mới sau cutover phải có chiến lược export/backfill khi rollback.

## 6. Work package E — Operator runbook cho Turso

Ghi checklist riêng tư nhưng không chứa secret: người dùng tạo Turso staging database khác production; xác nhận tổ chức/project/database ID trong dashboard; tạo readonly/service credentials phân quyền tối thiểu; nhập staging identity marker bằng công cụ người vận hành trên **staging đã xác minh**; cấu hình secrets qua hệ thống; chạy health/status test; download snapshot verified nếu muốn parity; revoke unused keys sau rehearsal. Không yêu cầu người dùng gửi credential cho chatbot. Agent không tự ngụy tạo cloud staging bằng một file local có cùng tên.

Có thể bổ sung script `doctor` chỉ in metadata safe như boolean env present, target host allowlisted, DB identity already validated, schema check status; không in URL/token. Chạy nó trước `npm run dev` khi Core muốn kết nối remote. Cần tránh SSRF hoặc accidental production database connection. Negative test guard với remote URL trùng known legacy, missing marker, public local marker used remote, marker mismatch, bad database permissions.

## 7. Acceptance criteria của phase

- `DATA-01`: complete schema/type/index/view/trigger comparison coverage với synthetic fixture.
- `DATA-02`: offline clone rejects corrupted/mismatched/unchecked snapshots, không overwrite.
- `DATA-03`: independent checksum provenance recorded; không có raw snapshot trong repo/log.
- `DATA-04`: all card IDs/review histories/persistent parameters proven preserved trên snapshot nếu available; nếu không có `BLOCKED_EXTERNAL`.
- `DATA-05`: remote staging identity được verify độc lập trước khi cho bất kỳ write; chưa có thì `BLOCKED_EXTERNAL`.
- `DATA-06`: rehearsal report có exact commands và trước/sau row/hash assertions.
- `DATA-07`: cutover freeze/catch-up/rollback documented với ownership và manual approval.
- `DATA-08`: regression suites Web/Core/FSRS không fail vì script/config thay đổi.

Một phase pass với fixture tests không tự đạt tất cả 8 điểm; mọi AC liên quan production phải có evidence thật. Khi thiếu snapshot, báo `IMPLEMENTATION_PARTIAL, LIVE_DATA_GATE_BLOCKED`, tránh điều chỉnh progress bằng việc tạo sample snapshots lớn.

## 8. Quy trình theo thứ tự trong phiên

Đầu phiên đọc `PHASE_03_REPORT` để biết schema hoặc event envelope đã thay. Kiểm tra Core migrations và status. Chạy existing audit tests. Ưu tiên cải thiện lỗi cụ thể ở scripts, thêm test negative cases, dựng report machine-readable, soạn runbook cloud cho người dùng. Không tạo remote staging tự động; không download production DB. Nếu không có credential/snapshot, hoàn thành mọi việc offline và bàn giao operator actions được sắp thứ tự. Nếu có tài liệu operator confirmation trong repo, vẫn không assume có authorization để cutover.

Cuối phiên đưa Phase 05/06 biết exact schema mapping, grammar/IELTS tables, data access abstraction, known unavailable fixture modules và những scripts an toàn. Khi cần migration schema Core, tạo migration code chưa apply trên staging thực; nói rõ đường lệnh để người vận hành review. Không chạy live migrations ngầm lúc server start.

## 9. Failure mode, rollback và báo cáo

Nếu mất dữ liệu trong temporary fixture, xóa fixture riêng do phiên tạo, không động input snapshot. Nếu gặp mismatch giữa exports, không âm thầm chuẩn hóa/hợp nhất rồi “pass”; ghi diff metadata và severity. Nếu permission denied, không thử production credentials. Nếu phát hiện schema column unknown, không thêm vào production DB; nghiên cứu mapping từ source và PR code. `PHASE_04_REPORT.md` phải trình bày table-by-table audit coverage, hash verification status, test matrix, external blockers và release stop conditions. Đây là điểm khóa cứng quyết định Phase 07 có thể đề xuất go-live hay không.
