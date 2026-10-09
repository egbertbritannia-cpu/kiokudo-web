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
