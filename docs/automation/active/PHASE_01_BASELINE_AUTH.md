# Phase 01 — Baseline + Authenticated BFF

> **BẢN ĐIỀU PHỐI ĐANG HOẠT ĐỘNG / ACTIVE 5-PHASE PLAN — 09/10/2026**
>
> Trọng số: **10/45 điểm**. Lượt chạy: **1/5**. Tài liệu điều phối duy nhất: [AUTOMATION_5_HOUR_PLAN](../../AUTOMATION_5_HOUR_PLAN.md).
> Phiên lập lịch là một phiên thực thi ưu tiên, **không phải cam kết hoàn thành tất cả tiêu chí trong một giờ**. Các phần chưa có bằng chứng cần giữ ở PARTIAL/BLOCKED. Dữ liệu production không được truy cập, không merge/deploy tự động.

## I. Chỉ thị mới cho lần chạy này

### Trình tự ưu tiên phiên 01
A. Khóa SHA Web/Core/legacy; lập route/API/data/prototype matrix và kiểm tra được test nào thật sự chạy.
B. Thiết lập/kiểm tra ranh giới trust browser → Web BFF → Core, principal provenance, no browser secrets, negative tests.
C. Triển khai một security vertical slice nhỏ nếu có bằng chứng code và môi trường. Phần auth chưa có provider thật chỉ được để feature-flag off; không bật writes.
D. Lập report `docs/automation/reports/PHASE_01_REPORT.md` với baseline và Auth AC-01..07; những AC chưa chứng minh phải là PARTIAL/BLOCKED.
**Gate sang Phase 02:** có map Core review contract và BFF per-user scoping; nếu thiếu, Phase 02 chỉ xây queue/test adapter offline, tuyệt đối không cấp quyền ghi giả.

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

### Phần kỹ thuật kế thừa từ phase 01 (kế hoạch cũ)

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

---

### Phần kỹ thuật kế thừa từ phase 02 (kế hoạch cũ)

# Phase 02 — Authentication, per-user authorization và ranh giới Web BFF ↔ Core

**Trọng số:** 7/45. **Phiên:** lịch thứ 2. **Tiền đề:** báo cáo phase 01; master plan; Web/Core HEAD hiện tại. **Mục tiêu:** tạo nền tảng cấp danh tính, xác thực request và phân lập tài nguyên người dùng, để phase 03/05/06 có thể mở thao tác ghi theo cách được kiểm soát. Một token dịch vụ dùng chung chỉ giải quyết kết nối server-to-server, không thay được quyền từng người học.

## 1. Phân tích luồng tin cậy trước khi code

Vẽ trust boundaries: `browser → Kiokudo Web route/server action → BFF → Kiokudo Core → staging DB`, `browser ↔ cache Dexie/localStorage`, và những tích hợp bên ngoài nếu có. Phân biệt tài khoản learner, service account nội bộ, provider OAuth, database credential và API key. Xác định ở legacy có sẵn cơ chế session Google/NextAuth hoặc mô hình single-user khác không bằng cách tìm code thật; không khẳng định “đã có auth” vì thấy nút đăng nhập. Đánh dấu zone untrusted là browser, URL params, cookies không được ký, CORS origin và offline payload. Service token luôn giữ ở backend.

Người dùng trước đây muốn app cá nhân với cơ chế auth đơn giản. Do đó đề xuất mặc định là **một allowlisted learner identity** hoặc provider session đơn giản, không đưa vào hệ thống RBAC doanh nghiệp. Tuy nhiên tính đơn giản không được đánh đổi bằng public endpoint có thể ghi dữ liệu. Có thể thiết kế adapter `getAuthenticatedPrincipal` trả `principalId`, `sessionId`, `authSource`, `issuedAt`, `expiresAt`; phương án thực tế của provider phải dựa trên cấu hình người dùng xác nhận. Không hardcode email người dùng trong source hoặc tests; fixture dùng `user_alpha` và `user_beta` là dữ liệu giả.

## 2. Work package A — Threat model cho BFF

Xem cách Web dùng `KIOKUDO_CORE_URL`, `KIOKUDO_CORE_SERVICE_TOKEN`, `KIOKUDO_STAGING_READ_ENABLED`, các route `api/backend`, SSR Grammar, IELTS. Kiểm tra cờ localhost-only và xem request forward có vô tình chấp nhận URL/path tùy ý hay không. BFF không được biến thành open proxy hay relay bearer token từ browser tới Core. Khóa allowlist path+method theo contract; validate payload kiểu dữ liệu và giới hạn body. GET được trả đúng error, không fallback mock và không parse HTML error thành JSON có vẻ thành công.

Xây threat table: unauthenticated read of learner cards, cross-user GET, forged review POST, CSRF với cookie session, replay eventId trên tài khoản khác, brute-force session, server-side request forgery qua Core URL override, CORS wildcard, information disclosure qua logs và 503 leaking internals. Với mỗi threat ghi `impact`, `control`, `negative test`, `residual risk`. Không dựa vào việc app hiện chỉ có một người dùng để loại bỏ isolation; lỗi cross-user vẫn gây nguy cơ khi tài khoản được mở rộng hoặc bị chiếm.

## 3. Work package B — Contracts cho principal propagation

Định nghĩa ở Web server một `AuthContext` typed, không lấy `userId` từ JSON browser nếu session đã có. Cookie session phải được ký/xác minh, `HttpOnly`, `Secure` ở production, `SameSite` phù hợp và có expiry; không log cookie. BFF đọc session và đính kèm một internal user context đã được Core xác minh theo cơ chế đã chọn. Không chỉ gửi header `X-User-ID` có thể giả mạo từ public network; Core phải đặt trust boundary theo token và định dạng signed/asserted identity. Thiết kế có thể dùng service JWT ngắn hạn do Web server ký hoặc service bearer + signed principal; điều kiện là Core không chấp nhận user context không có nguồn tin cậy và không expose key trên client.

Contract `AuthorizedPrincipal`: `subject`, `scope`, `issuer`, `audience`, `expiresAt`; user resource queries dùng `subject` từ server context, không từ request body. Chỉ hỗ trợ scoped read/write từng learner; không tạo admin API ngoài scope. Core cần có mapping giữa IDs trong DB thật và principal khi làm production reconciliation; nếu chưa có user dimension, ghi migration path và backward-compatible behavior, không tự thêm `userId` vào hàng nghìn record mà chưa rõ legacy ownership.

Điểm mấu chốt: compatibility với schema hiện hữu. Nếu legacy là single-owner dataset, thiết kế `legacy_owner` mapping chỉ tồn tại trong controlled staging migration, phải có constraint rõ trong DB và negative test. Không cho `unknown_user` mặc nhiên trở thành chủ tất cả cards. Không tự di chuyển row production.

## 4. Work package C — Fail-closed implementation slice

Nếu đã có đủ bối cảnh identity provider: thêm middleware ở Web API/BFF và Core, từ chối anonymous requests trước truy vấn DB, chuyển đổi lỗi 401/403/503 nhất quán. 401 khi chưa đăng nhập, 403 khi đã đăng nhập nhưng không có quyền, 503 khi staging gate/database không sẵn, 404 với resource không thuộc quyền để tránh lộ tồn tại nếu contract quy định. Không trả JSON success khi Core unavailable; không hiển thị thông tin nội bộ.

Nếu chưa có provider config, vẫn có thể tạo AuthProvider interface, typed request context, feature flag `KIOKUDO_AUTH_WRITE_ENABLED=false` mặc định và tests giả lập session cục bộ. Tuyệt đối không bật browser POST bằng shared development token. Chuyển BFF từ chỉ GET sang method allowlist POST chỉ sau khi có verified principal; có thể tách merge thành nhiều PR giữ phần write code disabled. Nên ưu tiên minimal diffs hơn refactor toàn bộ component tree.

Frontend cần state trung thực: thiếu login → UI hiển thị action unavailable/sign-in required; Core unavailable → staging unavailable. Không thêm nút login giả hoặc hiển thị reviewer đã “saved”. Nếu hiện legacy UI chưa có session affordance, thêm tối thiểu ở boundary mà không làm sai visual fidelity constraint; ghi screenshot diff và justification.

## 5. Work package D — Authorization tests

Unit tests phải cover: no cookie, invalid signature, expired token, wrong issuer/audience, token without subject, corrupted cookie, wrong method, forged userId, stale session, BFF API path traversal, Core 401, Core 403, CORS origin bất hợp lệ. Integration tests với SQLite fixture có ít nhất user A và user B; A chỉ đọc/ghi thẻ A, không đọc/grade thẻ B. EventId trùng giữa hai user không vô tình đè sự kiện nhau, và duplicates trong cùng user đúng identity semantics.

Đối với single-user owner mode, test rằng chưa map owner thì resource private không được lộ. Nếu schema chưa có userId, phải nêu limitation và block any multi-user promise. Verify service credential không xuất hiện trong client bundle, response header, error stack hoặc build logs. Dùng string search theo tên env và test generated artifacts, không log giá trị secret. Negative SSRF test không cho request Core URL trỏ sang destination tùy ý từ header/query.

Test môi trường staging độc lập, không xác nhận được bằng fake in-memory middleware đơn thuần. Nếu không có Core runtime khả dụng, test exact injected identity object và report `STAGING_E2E_PENDING`. Chạy suite hiện có để detect regression FSRS purity và visual hash.

## 6. Work package E — Quyết định deployment/auth cần người dùng

Lập `operator decision note`: ứng dụng tiếp tục single-user hay mở nhiều user? Nếu single-user, allowlist định danh nào được lấy từ provider đã xác thực? Có cần OAuth Google để giữ tính năng cũ không? Tên domain nào được bảo vệ ở staging và production? Không tự áp đặt một SSO thương mại hay email cá nhân từ lịch sử chat. Ưu tiên giảm số lượt người dùng cần can thiệp: cho phép complete code bằng adapter + fixtures trước, chỉ yêu cầu họ xác nhận provider khi deploy thật. Lựa chọn nhà cung cấp là quyết định sản phẩm, không phải lý do bypass authentication.

Nếu môi trường Vercel hỗ trợ Deployment Protection, ghi rằng lớp đó bảo vệ preview deployment nhưng không tự cung cấp identity per-user cho Core database. Phân biệt login vào Vercel với login vào ứng dụng. Do not assume preview password constitutes app auth. Khi staging deployed, configure separately and test from external client.

## 7. Hoàn thành, kiểm chứng và rollback

Acceptance criteria cấp nguồn:
- `AUTH-01`: Web không nhận browser writes không auth; negative tests pass.
- `AUTH-02`: Internal token không thể đọc từ FE bundle/network response; secret scan pass.
- `AUTH-03`: Core validates principal provenance/scope; forged header fail.
- `AUTH-04`: Cross-user read/write isolation proven on fixture, hoặc status `BLOCKED` nếu schema chưa support.
- `AUTH-05`: 401/403/503 contract nhất quán; FE xử lý trung thực.
- `AUTH-06`: Authentication approach và missing operator decisions được ghi rõ.
- `AUTH-07`: Existing GET routes, visual sources, tests không regression.

Không dùng test success chỉ để nhận 7 điểm; phải đánh giá từng AC. Có thể đạt `PARTIAL` nếu adapter/middleware đã có nhưng chưa cấu hình provider hoặc chưa được chứng minh end-to-end. Không thể `VERIFIED` nếu browser có thể POST khi anonymous.

Rollback chỉ là revert branch/PR thay đổi; bảo đảm feature flags mặc định chặn writes. Không thay production cookies, token, DB schema, domain. Nếu phát hiện một điểm yếu nghiêm trọng ở legacy production, không tự sửa ngoài phạm vi; báo lỗ hổng mà không đưa secret vào logs.

## 8. Handoff Phase 03

Bàn giao các interface chính xác: `getAuthenticatedPrincipal`, `requireUser`, Core trusted principal validator, review POST schema, BFF review endpoint path, trạng thái `write_enabled`, negative auth tests. Ghi SHA của cả hai repo phải đi cùng nhau và test matrix. Phase 03 chỉ được bật Web grading khi AUTH-01/02/03/04 qua test hoặc có deployment-local single-owner isolation được xác nhận tương đương. Nếu chưa qua, Phase 03 phát triển client offline queue và mock adapter nhưng không cho gửi write thật.

Báo cáo kết thúc phải nêu rõ phần nào là code mới, phần nào là kế hoạch chưa code, phần nào cần lựa chọn từ người dùng. Chất lượng phase 02 là chặn được thao tác sai quyền ngay cả khi attacker cố tình gửi HTTP request trực tiếp, không chỉ làm nút “Review” đẹp hơn.
