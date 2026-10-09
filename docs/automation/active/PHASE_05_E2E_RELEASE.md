# Phase 05 — Integration QA + Release No-Go/Go

> **BẢN ĐIỀU PHỐI ĐANG HOẠT ĐỘNG / ACTIVE 5-PHASE PLAN — 09/10/2026**
>
> Trọng số: **5/45 điểm**. Lượt chạy: **5/5**. Tài liệu điều phối duy nhất: [AUTOMATION_5_HOUR_PLAN](../../../AUTOMATION_5_HOUR_PLAN.md).
> Phiên lập lịch là một phiên thực thi ưu tiên, **không phải cam kết hoàn thành tất cả tiêu chí trong một giờ**. Các phần chưa có bằng chứng cần giữ ở PARTIAL/BLOCKED. Dữ liệu production không được truy cập, không merge/deploy tự động.

## I. Chỉ thị mới cho lần chạy này

### Trình tự ưu tiên phiên 05
A. Đọc reports 01–04, so sánh branch/PR với actual main; không coi PR chưa merge là chức năng đã deploy.
B. Run E2E/CI/screenshot/security/data-parity tests thực sự có thể chạy; nếu tool không cho chạy, ghi NOT_EXECUTED.
C. Tạo release manifest Web/Core SHAs, backup/rollback strategy, cutover checklists. Chỉ công nhận release-ready nếu không có P0 blockers và có staging thật được xác minh.
D. Lập `docs/automation/reports/PHASE_05_REPORT.md` và `docs/automation/reports/FINAL_5_RUN_SUMMARY.md`: exact verified points trong 45, blockers, các bước user phải làm.
**Gate sản phẩm:** dù tests pass, không auto merge, không tự deploy, không kết nối Turso production hoặc cutover. Phê duyệt production thuộc người dùng.

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

### Phần kỹ thuật kế thừa từ phase 07 (kế hoạch cũ)

# Phase 07 — E2E, visual parity, security review, deployment readiness và GO/NO-GO

**Trọng số:** 5/45. **Phiên:** lần thứ 7, phiên kết thúc chuỗi lịch; không phải lệnh tự động phát hành. **Đầu vào:** reports 01–06, HEAD/branch/PR mới nhất của Web/Core, source legacy đã pin, bộ evidence tests và migration runbook. **Mục tiêu:** tích hợp, kiểm chứng, sửa những blocker nhỏ còn đủ an toàn và đưa ra quyết định release có cơ sở. Nếu một gate production chưa đạt, báo NO-GO và bàn giao task tiếp thay vì cố deploy để có số 100%.

## 1. Baseline tích hợp trước khi test

Đọc lại master và cả sáu phase report. Không chỉ đọc kết luận `VERIFIED` mà kiểm tra commit SHA, PR status, những test thực sự chạy, issues được đánh dấu `BLOCKED_EXTERNAL`, contract schema migrations đang chờ và branch có conflict hay không. Một phiên viết code trên branch nhưng chưa merge vào main không đồng nghĩa main đã có feature đó; lựa chọn test HEAD/candidate integration branch rõ ràng. Kiểm tra `kiokudo-web` có pin đúng Core commit khi chạy smoke; không đối chiếu Web mới nhất với Core random HEAD rồi gọi là production parity.

Tạo `release manifest` gồm immutable Web SHA, Core SHA, legacy baseline SHA, Node/version/toolchain, package lock hashes, schema version, FSRS library version/parameters, DB migration checksum, fixture or snapshot provenance status và danh sách feature flags. Nếu những đầu vào này thiếu, manifest ghi `UNKNOWN` chứ không điền số hoặc giả định từ README. Không thêm secret values hoặc endpoint private vào manifest công khai.

## 2. Work package A — Automated quality gates

Chạy/build khả thi theo repo thực: `npm ci` khi lockfile có, `npm run check`, `npm test`, `npm run build`, Core Python unit tests, cross-repo smoke và các lint/security scripts nếu project có. Nếu có lỗi hãy phân loại lỗi do environment, flaky test, contract mismatch, security, data, UI. Không sửa test để che bug hoặc skip toàn suite rồi coi pass. Khi không có runtime để chạy lệnh, ghi `NOT_EXECUTED` với nguyên nhân; không dựa vào green badge không rõ SHA.

Thiết kế deterministic E2E paths ít nhất:
1. Unauthorized browser GET/POST → bị từ chối.
2. Authenticated Cards Library → chỉ thấy owned cards; filters/decks đúng.
3. Review grade Again/Hard/Good/Easy → đúng một transaction/log; canonical next due; reload đúng.
4. Mất mạng sau Core commit → replay cùng eventId → no duplicate.
5. Offline queue restart + out-of-order → chronological consistency hoặc explicit block nếu chưa supported.
6. Undo trước và sau ack theo semantics đã định; không display fake rollback.
7. Grammar lesson/practice và JPD133 eight slots → correct content/IDs/progress.
8. IELTS draft/submit/review/vocab → persisted and scoped; zero empty stats honest.
9. Staging DB identity marker missing/wrong → Core refuses routes.
10. Clone/audit snapshot tampered → parity tool refuses “pass”.

Với mỗi đường đi, ghi `scenario`, `preconditions`, `test runner`, `expected`, `actual`, `evidence artifact`, `status`; không gửi database exports vào report. Các đường đi chưa được triển khai đầy đủ phải có `BLOCKED` và issue/link, không dùng mock tests để thay end-to-end proof.

## 3. Work package B — Visual regression và product parity

Khóa bộ viewport tối thiểu: mobile hẹp ~375px, tablet ~768px, desktop ~1440px và thêm responsive state khác khi có lý do. Dùng browser screenshot hoặc Playwright nếu setup hiện có; đối chiếu legacy snapshot từ pinned commit với Web candidate. Chụp Studio/ten hash views đại diện, Cards, Review, Dò Bài, Culture, Conjugation, JPD133 overview + slot, Grammar gallery/lesson/practice, IELTS dashboard/session/review, UI demos. Trong báo cáo ghi `pixel diff/threshold` hoặc `manual comparison` với source hash; không nhận source hash equal là bằng chứng duy nhất cho rendering parity.

Các trường hợp visual cần kiểm: font fallback tiếng Nhật/việt, SVG/icon art loading, gradients, washi textures, scroll overflow, modal focus, error banners, loading skeleton, cards long text, empty state và unauthorized state. UI fidelity không yêu cầu cố hiển thị số liệu giả hoặc bỏ accessibility improvements; nếu cần thêm status, thực hiện thay đổi tối thiểu giải thích. Không redesign style và không thay asset gốc bằng hình được AI tạo. Chỉ chấp nhận diff có biên bản reason được reviewer xem.

Review usability: keyboard navigation tới grade buttons khi enabled, focus trap trong modal, alt text meaningful, contrast đủ đọc, screen reader status khi sync lỗi. Các vấn đề a11y được phân loại severity; không lấy visual match làm lý do giữ một lỗi an toàn sử dụng.

## 4. Work package C — Security & privacy threat acceptance

Kiểm tra server/browser trust boundary end-to-end: browser không cầm Core Bearer hay Turso token; request BFF phải có session và CSRF protection phù hợp; Core rejects forged principal; auth user scope trên tất cả GET/POST; no cross-user cards, review histories, grammar progress, IELTS sessions/vocab; staging identity marker trước khi phục vụ business routes. Kiểm tra request length, invalid JSON, path injection, idempotency conflict, unauthorized admin operations, data leak in logs, rate limiting và error leakage. Review dependency findings từ package lock nếu có tool; không tự bump major version trong phase release khi chưa test.

Xác định loại thông tin người học lưu trong offline queue, logs và OAuth/provider; retention, backup, sensitive data encryption/transit và cách logout xóa client data khi nhiều tài khoản dùng một browser. Với app cá nhân vẫn cần chống lộ private learning records ở deployment public. Nếu có Google/AI services chưa sẵn, report disabled features kèm user action; không fake integration qua external HTTP public.

Run rollback drill ở local/staging isolated: một candidate deployment lỗi, revert Web/Core refs tới previous verified SHA, verify schema backward compatibility, xác nhận DB không bị mutate bởi rollback thử nghiệm ngoài môi trường staging, verify monitor/health. Với migrations không thể down safely, phải có snapshot restore plan và maintenance strategy được operator phê duyệt. Không thử rollback trực tiếp production.

## 5. Work package D — Performance và operational readiness

Đo trang Cards/Review với fixture lớn hợp lý, xem pagination/n+1 issues; backend response error ratio và transactional latency được log aggregate không nhạy cảm. Test tải vừa phải trên local staging, không stress production, không dùng script public flood. Offline replay backpressure, retry jitter và queue compaction phải không quá tải Core hoặc tạo infinite loops. Xem CI reproducibility từ clean checkout; deterministic source pin tốt hơn test chạy dựa trên version không khóa.

Health checks tách liveness với readiness: `GET /health` không thể dùng làm bằng chứng business routes truy cập DB; authenticated `/status` có thể kiểm staging marker và schema nhưng không lộ secrets. Logging nên có request IDs, event IDs được hash/truncate phù hợp, error classification; không log auth cookies, plaintext answers hoặc credentials. Cảnh báo lỗi khi rate of failed review events tăng; monitoring không bắt buộc dùng vendor cụ thể nếu chưa có cloud config.

## 6. Work package E — Release decision

Xây bảng GO/NO-GO có severity và owner:
- Dữ liệu: snapshot production consistent, provenance independently verified, source/staging parity pass, preserved card IDs/review history, no known orphan.
- Bảo mật: auth BFF user isolation, Core private, secrets isolated, no anonymous write, no known critical vulnerabilities.
- Correctness: FSRS idempotency/undo/replay tested; Grammar/JPD133/IELTS trong scope có parity.
- UI: preserved layout and screenshot regression pass, no misleading success.
- Operations: staging deployed verified, backup & rollback rehearsed, monitoring healthy.
- Governance: user approved actual cutover and can inspect release manifest.

**Chỉ cần một P0 gate fail hoặc chưa có bằng chứng thì NO-GO.** Không có thực tế “production ready 90% nên cứ deploy”. Những feature out of scope phải được người dùng xác nhận là purposely disabled; chỉ lúc đó mới không tính là parity blocker. Không tự giảm scope để được GO.

Khi tất cả gates đã pass nhưng thiếu người dùng phê duyệt, status vẫn `TECHNICALLY_READY_PENDING_APPROVAL`. Việc chọn cutover window, domain, credentials và data freeze thuộc người dùng. Không chạy live Turso migration, không đổi Vercel production target hoặc DNS, không tự merge tất cả PR.

## 7. Điểm số và báo cáo kết thúc

Master chia 45 điểm thành [3,7,10,8,6,6,5]; điều phối cuối phải đọc AC của từng phase và ghi `earned / possible` với evidence ID. Ví dụ phase 03 có FE queue đã code nhưng undo unresolved và auth chưa pass thì không gán 10/10. Tiến độ mới là `55 + verified earned points` với chú thích chỉ là estimate; tổng số 55 không được coi là metric chính thức. Nếu một gate nặng fail, có thể áp `release cap`: không đạt trạng thái release-ready bất kể tổng điểm.

Tổng hợp `PHASE_07_REPORT.md` và `FINAL_7_RUN_SUMMARY.md`: timeline bảy phiên, trạng thái từng PR/commit, tests actually run, gate matrix, changes merged/not merged, external actions requested, known bugs, high-priority backlog, go/no-go, next action. Ghi chắc chắn rằng “7 phiên đã khởi chạy” khác “7 phase đã hoàn tất” khác “100% production cutover”. Nếu tool không thể write GitHub, trả report đầy đủ tại phiên hẹn.

## 8. Handoff cho người dùng và những việc không tự quyết định

Nếu thiếu credentials hoặc live snapshot, viết checklist từng bước người dùng có thể thực hiện trên provider dashboard mà không tiết lộ key: verify Turso account/database identity; tạo remote staging tách biệt; đăng ký provider OAuth/domain nếu dùng; set provider secrets trực tiếp; tạo/export backup consistent; approve test window; approve cutover. Mỗi bước nên có `why`, `safe verification`, `consequence if skipped`; chỉ yêu cầu bước tối thiểu thực sự cần cho MVP. Không bắt user phải cấu hình analytics trả phí, multi-tenant RBAC hoặc AI scoring nếu đó không thuộc mục tiêu ban đầu.

Chốt danh sách tồn đọng thành issues/PRs theo thứ tự P0→P3, gắn criterion to close và owner. Nếu đã hoàn thiện 100% code nhưng production vẫn bị chặn, nói đúng là `code-ready, not live`. Nếu code chưa đạt thì ghi `implementation incomplete` và tiếp tục theo vòng kiểm thử/chỉnh sửa khác; không quảng cáo đã xong chỉ vì đủ số lượt hẹn.

## 9. Lựa chọn hành động trong phiên cuối

Đừng dành toàn bộ giờ viết một tài liệu dài bỏ qua sửa lỗi nhỏ đã biết. Ưu tiên chạy suite và sửa bug có phạm vi hẹp, có regression test, không ảnh hưởng architecture. Ví dụ staging BFF trả 200 khi backend 503 là bug cụ thể có thể sửa; missing auth provider credentials không phải bug có thể bypass. Nếu CI fail vì Core pin drift, sửa pin chính xác sau khi đọc SHA và test. Nếu screenshot diff lớn, mở issue/PR cho visual parity; không rewrite layout ngẫu nhiên. Nếu migration parity fail, dừng release và báo metadata diff, không “fix” bằng dropping rows.

Tác vụ theo lịch phải phát hành báo cáo cuối bằng tiếng Việt với quyết định cụ thể. Báo cáo có thể không đầy đủ bằng mọi kỹ thuật kiểm thử mong muốn vì giới hạn công cụ/thời gian; mọi chỗ không xác minh được phải xuất hiện trong bảng NO-GO. Trong dự án này **dữ liệu học đã tích lũy là tài sản quan trọng hơn tốc độ cutover**, vì vậy một NO-GO trung thực là kết quả thành công về mặt quản trị rủi ro.
