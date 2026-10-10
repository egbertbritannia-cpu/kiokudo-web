# Kiokudo — ACTIVE_PROGRESS (nguồn trạng thái mỗi lượt chạy)

> **Last source-code audit:** 2026-10-10 ~17:42 Asia/Ho_Chi_Minh. **Nguồn audit chi tiết:** [CODE_LOGIC_PROGRESS_AUDIT_20261010.md](reports/CODE_LOGIC_PROGRESS_AUDIT_20261010.md). **Master:** [AUTOMATION_5_HOUR_PLAN.md](../AUTOMATION_5_HOUR_PLAN.md). **Lịch sử:** [RUN_LOG.md](RUN_LOG.md).
>
> **Cách tiếp tục:** Đọc phần `CURRENT CHECKPOINT` và `NEXT_ACTION` ở đây, rồi chỉ mở mã nguồn liên quan. Không audit lại toàn bộ repo nếu SHA/code liên quan không đổi. Nếu có code/diff mới, cập nhật nhận định theo chứng cứ mới.

## CURRENT CHECKPOINT

- **CURRENT_PHASE:** `01`
- **CURRENT_WORK_ITEM:** `P01-ASYNC-SCRYPT-RATE-LIMIT`
- **PHASE_01_STATUS:** `PARTIAL / SOURCE_VERIFIED_MAIN / CI_VERIFIED_PRIOR_BRANCH / REAL_STAGING_NOT_VERIFIED`
- **LAST_SOURCE_AUDIT:** `2026-10-10 ~17:42 +07`; không chạy fresh CI/tests trong lần audit này.
- **LAST_SCHEDULED_RUN:** lượt cũ ~08:45 +07 báo cáo checkpoint write bị chặn; lịch đã tạm tắt. **Không lập hoặc kích hoạt lịch mới từ checkpoint.**
- **WEB_MAIN_CODE_BASE_SHA:** `873233f12031bf3c7fa40fce8d7897bec9183584` (PR #9 đã merge; sau commit này chỉ có docs/checkpoint/audit commits tại thời điểm audit).
- **CORE_MAIN_CODE_BASE_SHA:** `7cb95fada09375a265ebbb2f6cfca6316dfb53f9` (PR #6 đã merge; Core auth code trên main).
- **WEB_LATEST_VERIFIED_DOCS_COMMIT:** `55256455e449fbe740db769e8cd7763430612540` (báo cáo audit mới; checkpoint/log commits có thể mới hơn).
- **CORE_PIN_IN_WEB_CI:** `6a7530dee4ecb1ab8e3ecc80dbf3c86f19e4c894` (Core PR head được fixture smoke dùng, không phải Core main merge SHA hiện hành).
- **LEGACY_REFERENCE_PIN:** `3348f4ee49c9539fb9ea60c96e42833811c325ca` (read-only).
- **CURRENT_GO_NO_GO:** `NO_GO` — chưa kiểm chứng real staging, dữ liệu owner và Review writes.
- **ALL_PHASES_DONE:** `false`; `DONE_VERIFIED_COUNT: 0/5`.
- **PRODUCTION_MODIFIED_IN_THIS_AUDIT:** `false`
- **FRESH_TESTS_RUN_IN_THIS_AUDIT:** `0` (source audit only; prior PR CI evidence dưới đây).

## VERIFIED NOW — logic trên main, khác với kết luận cũ

1. **Web PR #9 đã merge** qua [commit `873233f`](https://github.com/egbertbritannia-cpu/kiokudo-web/commit/873233f12031bf3c7fa40fce8d7897bec9183584). `owner-auth-server.ts` cấp HMAC-signed single-owner session; `middleware.ts` xác minh cookie bảo vệ learner routes; BFF route `src/app/api/backend/[...path]/route.ts` giới hạn GET, allowlist path/query, bắt buộc cookie, ký owner assertion và chỉ chuyển tiếp server-only service bearer đến Core staging. Browser mutation methods bị 405. **Risk còn lại:** `scryptSync` trong login request, public rate limiting chưa được chứng minh.
2. **Core PR #6 cũng đã merge**, hiện trên [Core commit `7cb95fad`](https://github.com/egbertbritannia-cpu/kiokudo-core/commit/7cb95fada09375a265ebbb2f6cfca6316dfb53f9). `app.ts` bắt bearer + signed owner assertion cho private endpoints; `auth/single-owner.ts` xác minh method/path/scope/sub/exp và `KIOKUDO_SINGLE_OWNER_DATASET_ACK`, chặn writes mặc định. Không phải full multi-tenant ownership: chỉ đúng khi có xác nhận một người sở hữu toàn bộ staging DB.
3. **CI trước merge trên feature branches** được báo cáo PASS: [Web Actions 38012855155](https://github.com/egbertbritannia-cpu/kiokudo-web/actions/runs/38012855155) (dedicated 13/full 23 + fixture Web→Core smoke); [Core Actions 38012513903](https://github.com/egbertbritannia-cpu/kiokudo-core/actions/runs/38012513903) (dedicated 4/full 26 + Python 14). **Không suy diễn CI của main commit mới đã được chạy lại**, không suy ra real staging.
4. **Review Web vẫn chưa có POST:** `src/app/review/page.tsx` có `handleGrade` chỉ hiển thị preview notice; undo chưa có Core transaction. `src/lib/fsrs-review-outbox.ts` **404 trên Web main**; logic ở P02 branch và Dexie legacy `offline-db.ts` vẫn đồng bộ theo endpoint /api/review cũ. Core `routes/reviews.ts` + `services/review-service.ts` có transactional FSRS single/batch và eventId dedupe, nhưng Web không nối.
5. **P03 snapshot checker vẫn chưa được vá trên Core main:** `scripts/audit_snapshots.py` có hash/DDL/count logic, nhưng thiếu rejection của WAL/SHM sidecars, FK/integrity check, check marker environment/row và baseline staging marker. Patch/tests local P03 cũ **chưa thành mã trên main**.
6. **Grammar + JPD133**: Core có GET catalog/practice/lesson; grammar card mapping dựa `deckId` và `tags.includes('lesson-'+id)` nên chưa là stable FK. Web practice lưu tiến độ `sessionStorage`, không có persistent learner history.
7. **IELTS**: Core chỉ cung cấp GET; Web `ielts/session` chỉ lưu nháp `localStorage`, `handleSubmitSession` chỉ báo chưa hỗ trợ; `ielts/review` khóa score/mistake/vocab writes. Không có cloud persistence E2E.
8. **Release**: synthetic CI ≠ real staging; snapshot parity/visual/browser offline E2E/rollback/cutover không verified.

## PHASE CHECKLIST — luôn đánh dấu theo nghiệm thu, không theo giờ

| Phase | Done? | Status hiện tại | Điểm quản lý tạm tính | Những điều kiện còn thiếu |
| --- | --- | --- | ---: | --- |
| **P01 — Baseline/Auth/BFF** | [ ] | **PARTIAL; Web+Core logic merged** | **4/10** | async scrypt + public login throttle, Core/Web main CI, signed read trên staging thật, one-owner dataset provenance/operator approval, security acceptance |
| **P02 — FSRS/Offline/Undo** | [ ] | PARTIAL; Core primitives; outbox branch-only | 2/10 | Web grade→BFF→Core, IndexedDB persisted outbox, replay idempotency, server undo, browser E2E |
| **P03 — DB/Data parity** | [ ] | PARTIAL/BLOCKED_EXTERNAL; snapshot patch local-only | 2/8 | land snapshot guards/tests, true staging clone and independently verified export/history parity |
| **P04 — Grammar/JPD133/IELTS** | [ ] | PARTIAL; read-only APIs, no cloud writes | 1/12 | persistent stable IDs, modules auth and cloud write E2E, IELTS session revisions/submission |
| **P05 — E2E/Release** | [ ] | PARTIAL/BLOCKED_EXTERNAL; NO_GO | 1/5 | visual/browser/security/rollback/real staging release validation |
| **TOTAL** | **0/5 DONE_VERIFIED** | | **10/45 tạm tính** | **45 điểm là trọng số phần còn thiếu** |

### Progress metric rules

- **HISTORICAL_BASELINE_ESTIMATE:** `55/100` — từ audit trước, **không re-audit baseline trong lần này**.
- **PREVIOUS_PROVISIONAL_REMAINING_POINTS:** `8/45` → **NOW `10/45`**, P01 2→4 do **Web và Core auth đã merge + CI fixture có bằng chứng**. Đây là **phân bổ định tính** cho lập kế hoạch, không phải số accepted AC tính tự động.
- **CURRENT_PROVISIONAL_TRACKING_ESTIMATE:** `~65/100` = 55 + 10. Không được gọi là `65% production ready` hoặc `65% functionality verified`.
- **MAIN-INTEGRATED P02–P04:** chưa tăng; prior local tests/docs/PR không tự động thành functionality.
- **VERIFIED_RELEASE_READINESS_PERCENT:** `NOT_MEASURABLE`. Quyết định GO/NO_GO: `NO_GO`.
- **Acceptance rule:** tick `[x]` khi mọi AC của phase đạt, có code/CI phù hợp và evidence real staging nếu AC đòi hỏi; PR open và fixture-only = chưa done.

## NEXT_ACTION — thứ tự ưu tiên cho lượt tiếp

1. **P01-ASYNC-SCRYPT-RATE-LIMIT (current):** thay `scryptSync` trong `src/lib/owner-auth-server.ts`/login handler bằng async `scrypt` không chặn event loop, bổ sung unit tests (correct password/wrong config/invalid hash/cancel/repeated concurrent requests). Bổ sung public login throttling ở tầng provider hoặc app có rate-limit đáng tin; không giả vờ rate limit chỉ bằng in-memory khi chạy serverless. Tạo branch/PR, không auto merge/deploy.
2. **P01-WEB-CORE-CI-PIN:** kiểm tra Web `main` với Core `7cb95f...`, sau đó pin compatible Core merged SHA trong Web CI thay cho prior branch head; xác minh test/check/build và signed route negative cases trên code main+PR.
3. **P01-STAGING-OWNER-PROVENANCE (BLOCKED_EXTERNAL):** operator xác nhận DB staging riêng, exactly-one-owner data provenance, origin URLs, keys/secrets trong protected dashboard, HTTPS và rate limiting. Test end-to-end với staging **chỉ khi operator ủy quyền**, không truy cập Turso production. Khi blocker hết, nghiệm thu P01 AC và tick; kế đó mới chuyển P02.

### Resume protocol

- Mỗi lần đọc file này trước. Kiểm tra Web/Core HEAD thực tế so với `*_CODE_BASE_SHA`, chỉ xét diff mới liên quan. Đọc một file phase đang làm, report liên quan, code vùng đó. Không lặp full-source audit cho các file hash không thay đổi.
- Mỗi lượt cập nhật **current phase, work item, SHA, test commands/results, blocker, next action**; thêm dòng `RUN_LOG.md`. Nếu đang `PARTIAL`, không chuyển phase. Nếu không thể ghi checkpoint, báo `CHECKPOINT_WRITE_BLOCKED`; không tuyên bố đã lưu.
- Code trên branch/PR chỉ là `READY_FOR_REVIEW`; source merged là `SOURCE_VERIFIED_MAIN`; prior CI results không tương đương test trong lượt này.
- Không merge/deploy/cutover tự động, không dùng Turso production, không in secrets hay fake history. Chỉ duy trì `NO_GO` đến khi nghiệm thu đúng.
