# HƯỚNG DẪN KẾT NỐI TIKTOK MARKETING API (CHI TIẾT)

Tài liệu này hướng dẫn chi tiết cách tạo ứng dụng trên **TikTok For Business Developers** và cấu hình **OAuth2** để tự động đồng bộ hóa các chỉ số quảng cáo (Chi phí, Lượt xem, Click) về Dashboard CRM của bạn.

---

### 🚀 QUY TRÌNH THIẾT LẬP (15 - 20 PHÚT)

#### BƯỚC 1: ĐĂNG KÝ TÀI KHOẢN DEVELOPER
1.  Truy cập: [ads.tiktok.com/marketing_api/homepage](https://ads.tiktok.com/marketing_api/homepage/)
2.  Đăng nhập bằng tài khoản **TikTok For Business** của bạn.
3.  Hoàn thiện thông tin hồ sơ Developer nếu đây là lần đầu tiên (Chọn loại hình Doanh nghiệp hoặc Cá nhân).

#### BƯỚC 2: TẠO ỨNG DỤNG (APP) MỚI
1.  Tại Dashboard của TikTok Developer, nhấn nút **'Create App'**.
2.  **App Name**: Đặt tên ứng dụng (Ví dụ: 'My CRM Connector').
3.  **Industry**: Chọn ngành nghề phù hợp (Ví dụ: Ecommerce hoặc Software).
4.  **Description**: Mô tả ngắn gọn (Ví dụ: 'App dùng để đồng bộ chỉ số quảng cáo về Dashboard nội bộ').
5.  Nhấn **Confirm** để tạo.

#### BƯỚC 3: CẤU HÌNH OAUTH & REDIRECT URI
Đây là bước quan trọng nhất để TikTok cho phép CRM kết nối.
1.  Trong menu ứng dụng vừa tạo, tìm đến mục **Redirect URI**.
2.  Nhấn nút **Add URI** và dán chính xác đường link Redirect URI mà hệ thống CRM cung cấp (Copy từ tab cấu hình TikTok trên CRM).
    *   *Ví dụ: `https://your-domain.com/api/tiktok/callback`*
3.  **Scopes**: Tại mục **Permissions**, hãy chọn các quyền cần thiết:
    *   `Ads Management`: Để đọc thông tin chiến dịch.
    *   `Ads Reporting`: Để lấy các chỉ số hiệu quả (Chi tiêu, Click...).
4.  Nhấn **Save Changes**.

#### BƯỚC 4: LẤY APP ID VÀ SECRET KEY
1.  Tìm mục **App Secret** trong cài đặt ứng dụng. Nhấn **Show** để xem mã bí mật.
2.  Sao chép **App ID** và **Secret Key** để dán vào CRM.

#### BƯỚC 5: KẾT NỐI TRÊN CRM VÀ ỦY QUYỀN
1.  Quay lại Dashboard CRM, dán **App ID** và **Secret Key** vào Form cấu hình TikTok.
2.  Nhấn **Lưu cấu hình**.
3.  Nhấn nút **Kết nối tài khoản TikTok**. Hệ thống sẽ chuyển bạn đến trang của TikTok để xác nhận.
4.  Nhấn **Confirm** (Xác nhận) để cấp quyền cho ứng dụng.

---

### 💡 LƯU Ý QUAN TRỌNG
*   **Redirect URI**: Phải khớp chính xác từng ký tự. Nếu sai, bạn sẽ gặp lỗi `Invalid Redirect URI`.
*   **Trạng thái App**: Ban đầu App của bạn có thể ở trạng thái `Sandbox` hoặc `Development`. Bạn vẫn có thể kết nối được với tài khoản của chính mình để kiểm tra dữ liệu.
*   **Hạn mức API**: TikTok có giới hạn số lần gọi API mỗi ngày, thông thường gói miễn phí đã đủ cho nhu cầu Dashboard cá nhân.
