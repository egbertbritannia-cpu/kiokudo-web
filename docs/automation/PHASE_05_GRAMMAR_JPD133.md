# Phase 05 — Grammar + JPD133: persistent IDs, thực hành và parity với legacy

**Trọng số:** 6/45. **Phiên:** lần thứ 5. **Phụ thuộc:** Web/Core authenticated adapter phase 02; canonical Review semantics phase 03; schema/ID mapping và provenance phase 04. **Mục tiêu:** đưa hai cụm Grammar và JPD133 từ “UI được bảo toàn + vài GET staging” thành các nghiệp vụ học có đối chiếu ID, lịch sử và test; không ép các prototype tự nhiên biến thành “đã lưu” khi cơ sở dữ liệu chưa hỗ trợ.

## 1. Khảo sát nguồn thực tế và taxonomy nội dung

Ở `japanese-srs-system`, xác định JPD133 manifest, tám slot curriculum, map vocab/card IDs, grammar lessons/patterns/exercises và các flow tạo synthetic card trong legacy. Đọc code source chứ không suy từ tên file. Khi đối chiếu source pin commit `3348f4ee...`, phân tách nội dung tĩnh trong JSON/bundled curriculum khỏi thẻ FSRS có ID persistent trong DB. Nếu một item trong JPD133 chỉ có `slot` + `word` mà không có card ID, cần identity mapping xác định và kiểm soát collision; không assume thứ tự mảng là ID bất biến.

Ở Web mới, kiểm tra `/curriculum/jpd133`, các `/slot`, `/grammar`, `/grammar/[lessonId]`, `/grammar/practice`, Review navigation. UI đã được chuyển theo nguyên bản; phần còn thiếu chủ yếu là truy cập dữ liệu thật, lưu thực hành và consistent IDs. Cần giữ nguyên manifest source và hình ảnh, không tự thêm bài học mới hay sắp xếp lại slot để dễ map.

## 2. Work package A — Nguồn chuẩn và schema mapping

Tạo `ContentIdentityMap` định nghĩa rõ các identity domains: `lessonId`, `patternId`, `exerciseId`, `curriculumSlotId`, `contentEntryId`, `cardId`. Không dùng chung một trường `id` kiểu string cho tất cả khi chúng thuộc bảng và semantics khác nhau. Bất kỳ mapping synthetic grammar card sang FSRS phải chỉ ra 1–1, 1–many hoặc no-card; nếu 1–many phải có explicit primary/secondary identity, không chèn ngẫu nhiên.

Lập diff table: legacy ID, new DB ID, source manifest fingerprint, owning deck, localized fields, grammar pattern, content revision, review linkage và mapping status. Bằng fixture có thể dùng deterministic namespaced IDs và unique constraints. Với production thật, phải preserve IDs khi xuất snapshot hoặc có bảng mapping reversible đã được kiểm toán; không tự regenerate `UUID()` cho toàn bộ corpus. Mismatch sẽ ảnh hưởng history/progress nên là `HIGH/CRITICAL`, không phải chỉ aesthetic.

Một số legacy synthetic cards có thể được sinh tự động khi người dùng học grammar. Phải xác nhận behavior trước khi port: lúc nào tạo, ai sở hữu, unique key, có trường hợp duplicate hoặc side effect khi GET? Không cho `GET /grammar` tạo card, không cho `GET /grammar/practice` seed/exercise. Mutation phải qua authenticated transaction riêng, có event ID hoặc dedupe key, ownership guard và audit. Nếu người dùng đã bỏ chức năng Add Card, không biến synthetic creation thành Add Card tự do.

## 3. Work package B — Grammar GET contract và practice

Kiểm tra Core GET grammar catalog, detail, practice exercise endpoints đã triển khai tại Phase 4B. Verify pagination/search/filter và expected response shape. Khi bảng staging không tồn tại, API trả 503; FE phải hiện trạng thái unavailable phù hợp, không lấp dữ liệu bằng hard-coded giả. Empty state khi catalog rỗng phải khác lỗi mất kết nối. Phần PatternCard/StructureDiagram cần bảo toàn JSX/styles; chuyển dữ liệu bằng adapter có type validation, không rewrite UI.

Grammar practice hiện có local grading. Nếu mục tiêu là tự luyện mà không ghi FSRS, xác nhận scope đó và test rằng UI không nói “đã lưu lên cloud”. Nếu muốn practice ảnh hưởng tiến độ, thiết kế `practiceAttempt` hoặc `reviewEvent` có explicit semantics: graded local quiz không tương đương FSRS review nếu thuật toán chưa định nghĩa mapping. Phải ghi rõ khi nào sự kiện đó là FSRS transition, tránh double-count một lần practice và một lần review.

Tạo API mutation scoped/user-authorized: có thể `POST /grammar/practice/attempts` nếu contract phù hợp, với `lessonId`, `exerciseId`, `submittedAnswer` chuẩn hóa an toàn, `attemptId` idempotent; server score canonical và trả progress. Không ghi answer đúng/feedback nhạy cảm vào logs. Nếu schema chưa được người dùng phê duyệt, implement contract draft, feature flag off và tests; chưa migrate dữ liệu thật.

## 4. Work package C — JPD133 flow và Review routing

Với mỗi trong tám slots, xác nhận manifest data, navigation, vocab collection và liên kết tới Dò Bài hoặc Review. Nếu Dò Bài vốn chỉ là prototype, giữ đúng trạng thái prototype; muốn link vào SRS phải có card mapping và authenticated review route. Không tạo trải nghiệm khiến người học tưởng Dò Bài đã cập nhật FSRS khi thực tế chỉ random sample. Theo mục tiêu “không redesign”, chỉ thay data adapter, destinations và các status labels tối thiểu.

Kiểm tra special characters tiếng Nhật, Unicode normalization NFC/NFKC, reading kana variants, pitch/meaning fields, duplicate vocabulary across slots và localized content. Không dùng text của từ làm primary key vì homograph/variant có thể trùng; stable ID phải đến từ manifest/DB mapping. Nếu một card liên quan nhiều slot, cần table join hoặc `slot_cards` thay vì duplicate cards làm lệch SRS scheduling.

Test opening direct URLs với `lessonId` và `slot` không hợp lệ, thiếu quyền, deleted item, stale manifest version; đảm bảo không bị path traversal/query injection. Cấu trúc route Next.js 15 có thể thay đổi params typing; build check để phát hiện lỗi runtime vs compile time. Phải giữ giao diện font/spacing/artwork/culture gốc, không cắt assets không liên quan.

## 5. Work package D — Progress semantics và consistency

Định nghĩa chính xác “hoàn thành bài ngữ pháp” là gì: viewed lesson, completed local quiz, achieved score threshold, or submitted FSRS review. Không dùng cùng một field `completed=true` cho cả bốn khi không có contract. Session progress phải associate principal và update transactionally. Nếu người dùng reload/tab đổi, trạng thái từ Core phải canonical; local-only practice lưu nháp được nhưng không masquerade như history thực.

Nếu old system có progress logs, migration phải preserve identity, completion timestamp, attempts, card references và response; nếu không có lịch sử cũ thì đừng bịa lịch sử mới. Nếu migration gặp null/obsolete content IDs, tạo `unmapped` reconciliation report và block parity, không silently drop row. Một invalid foreign key phải được report theo tập hợp, không chỉ catch error rồi skip.

Lưu ý workload giai đoạn này chỉ nhắm parity, không thêm AI-generated lessons, không cải tiến thuật toán Kanji, không mở mới chức năng tạo card thủ công. Những việc ngoài scope được ghi backlog sau cutover.

## 6. Test plan theo tầng

Unit tests cho `ContentIdentityMap`, mapping collision, repeated manifest import, invalid ID, Unicode/duplicate vocabulary, deterministic exercise selection. Integration tests có SQLite fixture chứa ít nhất hai lessons, ba patterns, hai overlapping cards và hai users giả; GET không seed/mutate; practice submit idempotent; unauthorized user không thể ghi history. API contract tests so sánh OpenAPI/actual route shapes. Web tests click-through từ JPD133 slot tới view thực, lỗi 404 vs 503, success/pending text, không tạo fake sync.

End-to-end nếu environment cho phép: select JPD133 slot, tìm item có persistent ID, mở Review, chọn grade, xác nhận review log duy nhất ở Core, quay về slot thấy progress canonical. Với Grammar: chọn lesson, làm exercise, thấy local score, lưu progress chỉ khi mutation API được bật và bảo vệ; refresh vẫn chính xác. Nếu chưa thể chạy E2E, ghi `INTEGRATION_TESTED` hoặc `UNIT_TESTED`, không gọi `E2E_VERIFIED`.

Visual fidelity: screenshot cặp legacy/new ở desktop và mobile cho JPD133 overview, slot, Grammar gallery, lesson, practice. Tên artwork/asset hash được giữ; nếu có khác biệt do browser, báo có ghi chú, không thay palette. Chạy build cũng có vai trò bắt route import/bundle compatibility.

## 7. Acceptance criteria và severity

- `GRAM-01`: all existing GET endpoints map to actual schema và phát hiện missing tables đúng, không fake success.
- `GRAM-02`: synthetic-card mapping explicit, collision-free, no GET side effects.
- `GRAM-03`: practice semantics và persistence mode được định nghĩa, test auth/no double-count.
- `JPD-01`: eight original slot routes và manifest giữ nguyên content identity, artworks.
- `JPD-02`: persistent card IDs match Core and review history; không duplicate schedule.
- `JPD-03`: required legacy progress preserved hoặc documented unavailable.
- `UI-01`: visual regression và meaningful error states được test.
- `SEC-01`: only user-authorized writes, cross-user negative test.
- `DOC-01`: mapping table/runbook và phase report đầy đủ.

Nếu `JPD-02` không qua, UI chỉ được truy cập nội dung read-only và bị chặn review writes từ JPD133. Nếu grammar exercise không persist, mô tả rõ nó vẫn local-only. Phase được đánh `PARTIAL` nếu chỉ giải quyết GET. Hoàn tất phase không có nghĩa đã di chuyển xong lịch sử production khi phase 04 còn missing snapshot.

## 8. Triển khai thực tế trong phiên và handoff

Bắt đầu đọc `PHASE_04_REPORT`, xác nhận DB tables thực tế. Ưu tiên tạo mapping/test trước, sau đó adapter Web route, cuối cùng mutation nếu auth+scheduling contracts đã pass. Không sửa source content tĩnh để “phù hợp schema” khi có thể dùng mapper; tài liệu hóa mọi transformation. Chạy `npm run check`, `npm test`, `npm run build` ở repo bị thay; test cross-repo với pin SHA. PR riêng cho Core schema/mapping và Web adapter nếu cần. `PHASE_05_REPORT.md` nêu status từng route, identity mapping, schema delta và các khó khăn thực tế.

Bàn giao Phase 06 thông tin user progress schema, auth middleware và event/error semantics có thể tái sử dụng cho IELTS. Bàn giao Phase 07 screenshot targets, test commands, list routes còn mang nhãn prototype. Không tự merge hoặc kết nối production. Nếu một số nội dung legacy có dữ liệu thiếu reading, giữ nguyên record + explicit quality flag; không tự xóa hàng để test pass.
