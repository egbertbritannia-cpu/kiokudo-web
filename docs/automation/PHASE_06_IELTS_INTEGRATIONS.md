# Phase 06 — IELTS persistence, session lifecycle và tích hợp ngoài có kiểm soát

**Trọng số:** 6/45. **Phiên:** lịch thứ 6. **Tiền đề:** Phase 02 auth contract; Phase 04 schema provenance; Phase 05 progress semantics. **Mục tiêu:** đưa IELTS từ các màn hình bản gốc kèm staging GET read-only sang các nghiệp vụ lưu thực sự trong môi trường cô lập, có phản hồi lỗi chính xác và không tạo dữ liệu giả. Các tích hợp bên ngoài chỉ triển khai khi có credential/scope/phê duyệt thích hợp; không phá visual fidelity để dễ gọi API.

## 1. Hiện trạng và ràng buộc của IELTS

Web hiện có `/ielts` dashboard, `/ielts/session` phòng thi có timer và nháp cục bộ, `/ielts/review` phân tích & Vocab Vault. Core read-only hợp đồng gồm `GET /ielts/dashboard`, `GET /ielts/materials`, `GET /ielts/sessions`, `GET /ielts/sessions/:id`, `GET /ielts/vocab`, `GET /ielts/mistakes`. Legacy có thể từng seed sách/điểm demo trong GET; Core mới chủ ý trả 0 hoặc empty state thay vì vẽ band score không có dữ liệu. Đây là điều đúng, không phải bug cần xóa. Phải đọc actual code và docs để xác minh đường dẫn mới nhất trước khi code.

Tách domain: material content, assessment session, question response/log, score/evaluation, mistake taxonomy, vocabulary item, review session và learner progress. Không gom tất cả vào một JSON blob khó kiểm chứng chỉ để có API POST. Mỗi domain phải có stable IDs, ownership, lifecycle, error semantics và transaction boundary. Nếu legacy là thi giả lập với một số dữ liệu local-only, chưa đủ cơ sở để khẳng định scoring tự động chính xác; giữ local draft và `ungraded` rõ ràng.

## 2. Work package A — Domain model và vòng đời session

Định nghĩa trạng thái `DRAFT`, `ACTIVE`, `SUBMITTED`, `EVALUATED`, `CANCELLED` nếu phù hợp nguồn gốc code. Transition phải có preconditions: không submit session đã cancelled, không score một session chưa có responses, không sửa log sau finalization nếu không có revision mechanism. Thời gian bắt đầu, kết thúc, countdown timer và timezone phải canonical, không tin client time cho penalty/tính điểm khi cần toàn vẹn; nhưng không thay đổi giao diện timer gốc.

Dự kiến mutation API có thể gồm `POST /ielts/sessions`, `PATCH /ielts/sessions/:id/draft`, `POST /ielts/sessions/:id/submit`, `POST /ielts/sessions/:id/evaluation` (chỉ trusted scorer), `POST /ielts/mistakes`, `POST /ielts/vocab` và các delete/update scoped khi legacy hỗ trợ. Đây là **đề xuất contract cần kiểm tra** với schema và code, không khẳng định endpoint đã tồn tại. Idempotency keys cho create/submit; ETag/revision hoặc optimistic concurrency cho draft. Use transaction to update session/logs/mistakes atomically khi logic yêu cầu.

Một answer có thể bị submit hai lần do double click/network retry; phải trả canonical submission, không append duplicates hoặc cộng điểm hai lần. Version conflict trả `409` có payload an toàn; không im lặng overwrite câu trả lời của tab khác. Khi mạng rớt, draft giữ local, có nhãn “chưa đồng bộ”; đừng lạm dụng localStorage cho dữ liệu riêng tư nếu có định hướng multi-user và thiết bị dùng chung.

## 3. Work package B — Scoring và dashboard trung thực

Xác định nguồn điểm: automatically scored MCQ/reading/listening, manual rubric, externally evaluated writing/speaking, or no score. Không dùng một `band` số cố định hoặc random để lấp dashboard. Nếu không có thuật toán chấm writing/speaking đáng tin cậy, session có trạng thái `AWAITING_EVALUATION` và không show fabricated average. Mọi metrics của dashboard phải được tính từ persisted evaluated sessions, theo filters và time range rõ; zero state là zero, không phải “7.5 demo”.

Test aggregate stats: 0 sessions, 1 draft, N submitted without scores, 1 evaluated, duplicate submit, deleted/cancelled, pagination, missing timestamps và cross-user data. Score aggregation phải xử lý `null` khác 0 điểm và `ungraded` khác incorrect. Tránh `NaN`, chia cho zero, silent rounding. Dữ liệu hiển thị cần trace từ session IDs tới canonical logs.

Mistake taxonomy có thể trùng loại với vocabulary source; việc thêm Vocab Vault nên dùng composite unique constraint/hợp đồng duplicate policy thay vì append tràn. Nếu ứng dụng chỉ là personal MVP, hỗ trợ những thao tác legacy thực sự có; không tự xây AI examiner. Không bơm sample mistake rows vào production.

## 4. Work package C — Integration boundaries

Kiểm tra Google OAuth/media/audio và các nguồn ngoài hiện có trong legacy: cần gì, có phải tính năng bắt buộc cho cutover không, có thể chạy local-only trong giai đoạn đầu không. Tách integration bằng adapter interfaces để app build/test không cần live API key. Không copy secrets từ legacy .env hoặc API responses, không test với account thật của người dùng khi chưa được cho phép. Mọi external API call phải có timeout, cancellation, limited retries, quota/rate-limit handling, safe error text và privacy note.

Đối với Google OAuth, cần callback domain hợp lệ và đăng ký provider do user thực hiện. Nếu provider unavailable, feature status `DISABLED_EXTERNAL`; không hardcode bypass. Với audio/media, xác định asset source and license, preserve artwork, không tự upload file personal lên public storage. Nếu file server-side mất đường dẫn, báo missing media thay vì âm thầm thay URL ngẫu nhiên.

Nếu IELTS cần AI scoring hoặc speech evaluation, đòi hỏi explicit product decision, cost, data privacy và measurement criteria. Vì mục tiêu hiện tại là tách FE/BE đúng chức năng gốc, AI expansion ngoài scope không được tính 6 điểm của phase; báo backlog riêng. Trong trường hợp không đủ user permission, implement fake/test adapter chỉ trong tests, không đem fake results ra UI thật.

## 5. Work package D — API/backend implementation và bảo vệ dữ liệu

Xây typed DTO, zod/validation tương đương cho session create, draft update, submit, vocab save. Server chỉ chấp nhận user identity đã được phase 02 xác minh. Limit payload size, array lengths và file upload (nếu không có yêu cầu file thì chặn), validate ID membership, tránh mass assignment vào `score`, `userId`, `createdAt`. Chỉ trusted evaluator mới ghi score. Sessions/logs và mistake/vocab mutations tuân foreign keys và transactions. Nếu schema mới yêu cầu migration, tạo migration idempotent ở source và test against isolated SQLite; không apply remote tự động.

Core README có thể vẫn mô tả status phase 3 trước khi commit Phase 4B; nên cập nhật nếu đã verified, đừng dựa một dòng README làm bằng chứng. Update OpenAPI và route smoke khi thêm mutation; Web adapter giữ server-only Core bearer. Cross-repo pin phải được cập nhật có căn cứ, không dùng `main` không xác định trong CI.

## 6. Work package E — Web UI integration và trải nghiệm offline

Ở `/ielts/session`, giữ Examination Room layout và timer, dùng local draft như fallback khi offline; state cần chỉ rõ `LOCAL_ONLY`, `SYNCING`, `SYNCED`, `SUBMITTED`, `ERROR`. Submit button chỉ enabled khi auth, session contract và server availability đủ. Nếu submit bị mất response, fetch canonical session by id trước khi retry; repeat submit cùng idempotency key. Nếu local draft version lệch server, yêu cầu người dùng resolve conflict, không silently overwrite.

Ở `/ielts/review`, Vocab Vault và mistake save khi được bật phải hiển thị ack/confirmed state; không update permanent stats trước server confirmation. Nếu score chưa có, hiện pending evaluation, không hiển thị band giả. GIữ nguồn JSX/CSS; những thay đổi nhỏ để báo lỗi cần screenshot checks. Thử mobile viewport, keyboard accessibility và screen-reader labels phù hợp; không thêm dashboard mới.

## 7. Test matrix và định nghĩa thành công

- `IELTS-01`: create session và scoped ownership đúng, no anonymous writes.
- `IELTS-02`: draft update có optimistic concurrency, không mất câu trả lời do hai tabs.
- `IELTS-03`: submit idempotent và finality, no double credit.
- `IELTS-04`: dashboard aggregates accurate từ real fixture persisted sessions; zero state không fake scores.
- `IELTS-05`: mistakes/vocab CRUD có unique policy và owner isolation.
- `IELTS-06`: session recover after refresh/offline network error, trạng thái UI trung thực.
- `IELTS-07`: external integrations nếu unavailable phải disabled đúng, không lộ credentials.
- `IELTS-08`: tests unit/integration/contracts/build pass; no visual regression ở ba routes.
- `IELTS-09`: DB migration/test không chạm production, no test seeds on GET.

Một sample acceptance scenario: user A bắt đầu một session mới; draft hai câu; refresh; nhận lại draft của A; user B không thể GET/modify; A submit twice nhưng chỉ có một submission log; dashboard chỉ cập nhật khi status phù hợp. Scenario thứ hai: mất mạng sau submit; UI không báo “đã nộp thành công” trước khi xác minh canonical session. Nếu không có deployed auth, chạy scenario trong local controlled fixture, chưa tuyên bố cloud parity.

## 8. Handoff và rollback

Trong một phiên ngắn, ưu tiên contract/session create/submit/idempotency trước full integrations. Nếu thiếu schemas, tạo thiết kế + negative tests hữu ích; không thêm API thiếu contract. Nếu phần lớn IELTS chưa triển khai xong, báo `PARTIAL` theo từng AC, không claim 6/6. Đưa operator action list cho OAuth/media staging nếu cần nhưng không yêu cầu người dùng dán secret. Khi thay đổi bất kỳ DTO hoặc table, ghi migration compatibility, rollback SQL strategy dưới dạng *reviewable plan*, không chạy production.

`PHASE_06_REPORT.md` phải ghi API implemented vs proposed, exact test commands/results, data semantics, external blockers, ảnh hưởng tới Web/Core SHA, screenshot targets cho Phase 07. Từ report này Phase 07 phải biết những bài test nào thực sự có thể chạy, page nào chỉ local-only và release blockers chưa được giải quyết. Nếu người dùng muốn loại hẳn IELTS khỏi scope sản phẩm, cần quyết định explícit trước khi trừ trọng số/đánh dấu hoàn tất; không tự xóa chức năng để đạt 100%.
