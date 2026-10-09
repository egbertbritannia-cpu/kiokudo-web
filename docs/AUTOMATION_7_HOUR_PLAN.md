# ARCHIVED — AUTOMATION_7_HOUR_PLAN.md

**Kế hoạch 7 phase đã được thay bằng kế hoạch 5 phase vào ngày 09/10/2026.**

Để tránh các tác vụ tự động đọc nhầm chỉ dẫn, vui lòng dùng **[AUTOMATION_5_HOUR_PLAN.md](AUTOMATION_5_HOUR_PLAN.md)** làm nguồn điều phối duy nhất. Năm tài liệu triển khai đang hoạt động nằm ở [docs/automation/active/](automation/active/). Chúng giữ đầy đủ phần đặc tả chi tiết từ cả bảy phase cũ và có thêm cổng chặn cùng lịch thực thi mới.

| Phase mới | Các phase cũ được hợp nhất | Trọng số |
| --- | --- | ---: |
| 01 Foundation & Auth | 01 + 02 | 10 |
| 02 FSRS & Offline | 03 | 10 |
| 03 Database Parity | 04 | 8 |
| 04 Grammar/JPD133 & IELTS | 05 + 06 | 12 |
| 05 E2E & Release | 07 | 5 |
| **Tổng** | **7 → 5** | **45** |

Bản gốc của file kế hoạch 7 phase vẫn lưu được qua Git history. Các lần chạy theo lịch phải căn cứ vào kế hoạch 5 phase mới, không tự suy diễn bổ sung phiên thứ 6 hoặc 7.
