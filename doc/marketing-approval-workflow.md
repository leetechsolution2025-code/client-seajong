# Quy trình Phê duyệt Kế hoạch Marketing

## 1. Khởi tạo và Gửi duyệt
- **Chủ thể**: Trưởng phòng Marketing (người lập kế hoạch).
- **Hành động**: Khi hoàn thiện kế hoạch, Trưởng phòng Marketing nhấn "Gửi duyệt".
- **Hệ thống xử lý**:
  - Trạng thái kế hoạch chuyển thành **Đang phê duyệt** (`pending_approval`).
  - Dữ liệu kế hoạch được gửi thông báo tự động đến **Trưởng phòng Tài chính - Kế toán** và **Giám đốc**.

## 2. Quy trình Duyệt (Điều kiện chặt chẽ)
- **Chủ thể**: Trưởng phòng Tài chính - Kế toán & Giám đốc.
- **Hành động**: Đánh giá và quyết định "Phê duyệt" hoặc "Từ chối".
- **Logic xử lý**:
  - **Từ chối**: Nếu *bất kỳ một trong hai người* (Tài chính hoặc Giám đốc) bấm "Từ chối", kế hoạch lập tức chuyển trạng thái thành **Đã từ chối** (`rejected`). Toàn bộ luồng duyệt kết thúc.
  - **Phê duyệt**: Kế hoạch CHỈ được chuyển sang trạng thái **Đã phê duyệt** (`approved`) khi có sự đồng ý của **CẢ HAI người** (Tài chính VÀ Giám đốc).

## 3. Hành động tự động sau khi duyệt
- Khi kế hoạch đạt trạng thái **Đã phê duyệt**:
  - **Sinh Yêu cầu chi**: Hệ thống tự động tạo một **Yêu cầu chi tiền** (Expense) tương ứng với ngân sách kế hoạch và gửi cho Trưởng phòng Tài chính - Kế toán.
  - **Thông báo**: Hệ thống tự động gửi thông báo cho Trưởng phòng Marketing biết rằng kế hoạch đã được thông qua và luồng chi phí đã được khởi tạo.

## 4. Hệ quả đối với UI/UX
- Modal "Đề xuất chi phí hoạt động marketing" (nhập thủ công) không còn cần thiết và được loại bỏ hoàn toàn khỏi hệ thống, do Yêu cầu chi đã được sinh tự động từ kế hoạch được duyệt.
