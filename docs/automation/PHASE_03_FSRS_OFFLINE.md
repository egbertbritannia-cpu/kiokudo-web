# Phase 03 — FSRS Review end-to-end, offline queue, retry và undo semantics

**Trọng số:** 10/45, lớn nhất trong bảy phase. **Phiên:** lịch thứ 3. **Dependency bắt buộc:** các giới hạn auth/authorization của phase 02 phải được xác minh trước khi thực sự bật browser writes. **Scope:** luồng Grade bốn mức của Review UI mới, dữ liệu phản hồi từ Core, trạng thái offline, replay, xử lý nhiều lần gửi và khả năng undo; không restore Add Card và không sửa FSRS algorithm cho đẹp số liệu.

## 1. Phân rã đường đi của một review event

Bắt đầu từ UI Karuta/Review hiện tại: load cards, reveal answer, chọn Again/Hard/Good/Easy, build event payload, lưu trạng thái local, gửi server, nhận ack, cập nhật UI và due queue. Đối chiếu từng node với code legacy để bảo toàn cảm giác học tập gốc. Xác nhận Core `POST /api/v1/reviews` và `POST /api/v1/reviews/batch` đang chờ `eventId`, `cardId`, `rating`, `reviewedAt`; đọc contract hiện tại trước khi viết adapter, không giả định field mới. Core quyết định scheduling, không dùng client-submitted `scheduledDays` hay stability/difficulty làm nguồn chuẩn.

Tách rõ ba kiểu trạng thái event ở FE: `LOCAL_PENDING` vừa được nhận vào queue và hiển thị pending; `IN_FLIGHT` đã gửi nhưng chưa xác định ack; `ACKNOWLEDGED` được Core xác nhận, với `duplicate` là kết quả replay của cùng event chứ không phải một review thứ hai. Thêm `REJECTED` khi input/server semantic conflict, và `NEEDS_RECONCILIATION` khi offline hoặc mất response. Không có state `SUCCESS` giả khi chỉ gọi IndexedDB/localStorage xong.

## 2. Work package A — Identity và schema event envelope

Thiết kế envelope typed gồm `eventId` UUID, `cardId` persistent ID, `rating`, `reviewedAt` theo instant UTC, `clientSequence` đơn điệu, `schemaVersion` và client-side metadata chỉ dành debug. Internal principal lấy từ server session và không tin client userId; queue local có namespace theo principal và không mix khi chuyển tài khoản. Xác định thời điểm tạo event ID: khi người dùng thật sự chọn grade, **trước lần gửi đầu tiên**, không tạo UUID mới khi retry. Nếu cần optimistic UI, lưu event trước khi cập nhật màn hình để tránh “grade thấy xong nhưng refresh mất event”.

IndexedDB/Dexie có schema version rõ, migration từ legacy queue nếu tồn tại; không overwrite bất ngờ bảng chứa learning history local. Nếu PWA service worker đã bị cố tình ngắt, không tự bật lại khi chưa có phép chứng minh parity/replay ownership. Nếu có hai tabs cùng hoạt động, cần unique event ID và cơ chế claim/lease để không phát double-send đồng thời; Core vẫn phải idempotent vì lease chỉ giúp giảm duplicate requests.

Client không lưu service token và không nhúng database credentials. Nếu không có authenticated BFF, chỉ triển khai interface, queue logic và test trong offline staging flag. Hoãn user-visible grading cho đến khi phase 02 được chứng minh.

## 3. Work package B — HTTP transport và trạng thái lỗi

BFF dùng POST allowlist nghiêm ngặt, validate JSON input, tối đa kích thước body, timeouts có ngữ nghĩa, trả HTTP error phù hợp. Retry chỉ dành cho network failure, 429, 503/5xx có chính sách backoff+jitter; không retry vô hạn khi 400/401/403/409 cho cùng payload lỗi. Trong trường hợp 401 do hết session, giữ hàng đợi nhưng không gửi đến khi auth khôi phục; không âm thầm đổi owner. Khi 409 vì cùng eventId nhưng payload khác, tạo cảnh báo integrity và ngừng replay sự kiện đó, không tạo event ID mới để “qua lỗi”.

Phân biệt lost request với lost response: nếu Core đã commit nhưng ack mất, FE replay chính eventId, Core trả `duplicate` hoặc canonical existing record. Test này là P0. Nếu browser refresh giữa request, state khôi phục từ IndexedDB. Nếu server trả status 200 nhưng body shape sai, client không được coi là thành công; lưu `NEEDS_RECONCILIATION`. Nếu server trả dueAt khác optimistic calculation, FE phải dùng canonical server result. Không trộn timezone local midnight trong stored `reviewedAt`.

## 4. Work package C — Scheduler correctness và concurrency

Từ Core tests hiện có, bổ sung gold cases dựa trên legacy `calculateReviewTransition` gốc: New, Learning, Review, Relearning; Again/Hard/Good/Easy; interval và due, difficulty, stability; multi-step trajectory. So sánh pure calculation output với legacy reference nhưng cũng test mutation trong DB transaction. Với event replay hãy cover repeated identical event, changed payload same ID, invalid card ID, non-owned card, concurrent retries, out-of-order client event timestamps, crash between API call và local acknowledgement, batch atomic failure. Kiểm tra thứ tự chronologically applied do service implement, không assume server nhận order là chronological.

Review logs phải có ràng buộc unique key cho eventId đúng scope, đồng thời update schedule và append log trong cùng transaction. Không thể dừng giữa chừng với card state mới nhưng thiếu log. Check SQLite transaction semantics và libSQL behavior; nếu concurrency multiple instances không thể test tại local, ghi rủi ro staging unresolved. Đối với sessions xảy ra qua thời điểm midnight, clocks khác nhau, stale cards sau long offline, quy định reject/reconcile rõ thay vì âm thầm chấp nhận state lệch.

FSRS parameters có thể được cá nhân hóa trong legacy; đừng mặc định parity hoàn chỉnh chỉ vì pure function pass. Đối chiếu parameter source hoặc report `PRODUCTION_PARAMETERS_UNKNOWN` cho đến khi snapshot thật có dữ liệu. Không tự thay algorithm version.

## 5. Work package D — Undo và consistency

Định nghĩa UX undo có hai tình huống: (i) event còn `LOCAL_PENDING`: có thể xóa/cancel từ queue nếu chắc chắn chưa từng gửi; (ii) event đã `IN_FLIGHT/ACKNOWLEDGED`: cần server-supported compensating transaction/undo semantics. Không lấy grade tiếp theo với rating đảo ngược làm “undo”; FSRS không có phép nghịch đảo tổng quát như vậy. Xem legacy có undo không, xác định expected behavior người học.

Nếu Core chưa hỗ trợ undo an toàn, UI có thể tạm hiển thị “không thể hoàn tác sau khi đã đồng bộ” một cách trung thực hoặc disable action; không giả vờ rollback local nhưng DB vẫn đã commit. Nếu thêm endpoint `POST /reviews/:eventId/undo`, yêu cầu owner check, kiểm soát newest-event-only hoặc quy tắc deterministic replay, transaction rollback/recompute chain, idempotent undo, audit trail và test. Đặc biệt nguy hiểm nếu event đã có reviews sau: undo có thể làm sai toàn bộ scheduler state. Ưu tiên thiết kế chính xác + flagged implementation hơn làm sai dữ liệu.

Test multi-tab và offline undo: A grade event offline, undo trước khi gửi: queue event không được xuất hiện trên Core; grade ack rồi undo: server trả canonical state và frontend cập nhật mọi tab. Nếu cả hai chưa làm được, acceptance `UNDO_PERSISTED` chưa đạt.

## 6. Work package E — UI integration giữ nguyên visual

Không thiết kế lại Karuta view. Thêm adapter ở boundary thay vì thay component. Show status cụ thể pending/synced/error bằng text hiện hữu hoặc unobtrusive element, không giả success. Nếu phiên trước chưa có identity, mọi write control vẫn disabled nhưng offline queue internals có thể test dưới feature flag. Không tạo practice reviews vào production DB; Dò Bài vẫn prototype nếu scope chưa được mở theo quyết định sản phẩm.

Tách local Dexie cache dùng để đọc from queue mutation dùng để ghi. Mọi cache invalidation sau ack phải dựa trên canonical server revision, không sửa toàn bộ cards từ optimistic estimate. Với deck filter, sau grade view phải update due list chính xác. Khi Core outage, người dùng có thể tiếp tục học offline chỉ khi queue persistence và eventual replay đã được test, nếu không thì chặn gửi, hiện cảnh báo.

## 7. Test matrix tối thiểu và phép đo

- `FSRS-01`: four grades, four states parity against source-reference; expected transition exact.
- `FSRS-02`: same eventId replay N lần tạo đúng một review log.
- `FSRS-03`: lost-response retry không mất event, không duplicate.
- `FSRS-04`: offline → restart browser → online được replay đúng thứ tự.
- `FSRS-05`: failed batch rollback atomic; no partial state corruption.
- `FSRS-06`: two accounts/users isolated; no forged grade across users.
- `FSRS-07`: undo tested end-to-end hoặc đánh dấu `BLOCKED`, tuyệt đối không fake.
- `FSRS-08`: FE vẫn giữ JSX/CSS/source/art baseline và báo lỗi trung thực.
- `FSRS-09`: client-generated due/stability không thể override Core.
- `FSRS-10`: từ chối request sai owner, stale version, bad rating và eventId conflict.

Có thể đo coverage bằng named tests và exact command log, không lấy số branch/files làm KPI. Ghi ảnh chụp sample event state timeline bằng fixture IDs giả, không chứa đời sống học tập thực. Nếu không có browser test runner, unit/integration proof vẫn có giá trị nhưng visual/offline UX phải đánh dấu pending.

## 8. Thứ tự triển khai giới hạn trong phiên

Ưu tiên: (1) kiểm tra contract/auth gates; (2) client eventId + Dexie queue; (3) BFF POST adapter nếu authorized; (4) replay reconciliation; (5) server canonical response mapping; (6) undo contract; (7) tests integration. Nếu không đủ khả năng hoàn thành toàn bộ 10 điểm, chọn vertical slice `click grade → persisted pending → authorized Core transaction → ack → canonical UI` kèm no-double-write test. Không đánh dấu hoàn tất offline/undo khi chỉ có online write.

Ghi `PHASE_03_REPORT.md` với các branch/PR, tests pass/fail/unrun, unresolved cases, quyết định undo. Dành `Next phase inputs` cho Phase 04: schema review logs, stable event IDs, fixture database path, required indexes, timestamps, visibility của card revisions. Nếu Core và Web phải thay cùng lúc, ghim Core SHA dùng trong Web CI và thiết lập contract compatibility. Không buộc người dùng xác nhận từng edit nhưng không tự phê duyệt auth/production rollout.

## 9. Điều kiện rời phase

`VERIFIED` chỉ khi online grading thực sự được bảo vệ, idempotent và offline persistence/replay cùng undo semantics trong scope đã được test end-to-end, không có log giả. Nếu thiếu authorized session, phase chỉ `PARTIAL` dù viết đủ FE code. Nếu Core batch replay chưa chứng minh concurrency safety, ghi blocker; không bật offline auto replay. Nếu snapshot production không có, có thể vẫn xác nhận fixture correctness nhưng không cam kết dữ liệu thực. Mọi unknown được đưa sang Phase 04/07 đúng tên, không làm mất dấu ở bảng tiến độ.
