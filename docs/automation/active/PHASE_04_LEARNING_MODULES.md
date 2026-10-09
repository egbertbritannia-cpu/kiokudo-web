# Phase 04 — Grammar/JPD133 + IELTS + Integrations

> **BẢN ĐIỀU PHỐI ĐANG HOẠT ĐỘNG / ACTIVE 5-PHASE PLAN — 09/10/2026**
>
> Trọng số: **12/45 điểm**. Lượt chạy: **4/5**. Tài liệu điều phối duy nhất: [AUTOMATION_5_HOUR_PLAN](../../../AUTOMATION_5_HOUR_PLAN.md).
> Phiên lập lịch là một phiên thực thi ưu tiên, **không phải cam kết hoàn thành tất cả tiêu chí trong một giờ**. Các phần chưa có bằng chứng cần giữ ở PARTIAL/BLOCKED. Dữ liệu production không được truy cập, không merge/deploy tự động.

## I. Chỉ thị mới cho lần chạy này

### Trình tự ưu tiên phiên 04
A. Chia giờ xử lý thành hai lát nghiệp vụ có thể kiểm chứng. Ưu tiên stable IDs và không duplicate review for Grammar/JPD133, kế đến session lifecycle/idempotent drafts/submissions của IELTS.
B. Gắn domain models với auth Phase 01, FSRS Phase 02 và schema provenance Phase 03. Không chuyển local practice thành FSRS event nếu semantics chưa rõ; không tạo band scores lịch sử giả.
C. Giữ nguyên UI, asset và tám slot. Với external Google/media, chỉ viết adapters/gates; không thu thập credential hay tự bật production.
D. Lập `docs/automation/reports/PHASE_04_REPORT.md` có riêng ma trận GRAM/JPD và IELTS AC, và test thực chạy. Nếu không đủ một lượt, báo phần chưa hoàn thiện; không claim 12/12.
**Gate sang Phase 05:** các unresolved API contracts, fixtures, user approvals và visual screenshots targets phải được chuyển đầy đủ.

## II. Checklist chung phải thực thi trước và sau mỗi phần việc

1. Đọc HEAD SHA thực tế của cả hai repo và báo cáo của lượt trước; không dựa vào mô tả cũ khi code thay đổi.
2. Kiểm tra test từ code, chỉ ghi PASS nếu có exit code/log thực sự; có thể tạo PR nhỏ để triển khai và test nhưng không tự nhập thay đổi vào production.
3. Tránh lộ service tokens, snapshots, learning data trong logs và commits. Chặn mọi write không được authenticated user context chứng minh.
4. Phân tách `implemented`, `verified under synthetic local staging`, `verified under real staging` và `authorized for production`.
5. Ghi outcome theo AC cụ thể, `VERIFIED|PARTIAL|BLOCKED_EXTERNAL|FAILED` và điểm công việc đạt trong trọng số, có links commit/PR.
6. Tuân thủ đúng thứ tự ưu tiên mục I; nếu thiếu thời gian, làm vertical slice nhỏ test end-to-end thay vì đưa ra tuyên bố hoàn thành sai.
7. Cung cấp handoff cho phase kế tiếp, nếu không còn phase thì tổng hợp và đưa GO/NO-GO rõ ràng.

## III. Đặc tả kỹ thuật chi tiết được bảo toàn từ kế hoạch 7 phase

> **Lưu ý về lịch sử:** Hai hoặc một work-package cũ dưới đây đã được hợp nhất thành một phiên mới. Các nhãn “phase”, “lượt”, “report” và bàn giao nằm trong nội dung lưu trữ chỉ là bối cảnh của kế hoạch 7 phase trước đây; **không được tạo thêm 7 phiên hoặc báo cáo trùng**. Luôn dùng mapping và tên report ở Mục I và master 5 phase. Những kỹ thuật, negative tests, giới hạn dữ liệu và acceptance criteria vẫn áp dụng trừ khi xung đột với Mục I.


---

### Phần kỹ thuật kế thừa từ phase 05 (kế hoạch cũ)

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

---

### Phần kỹ thuật kế thừa từ phase 06 (kế hoạch cũ)

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
