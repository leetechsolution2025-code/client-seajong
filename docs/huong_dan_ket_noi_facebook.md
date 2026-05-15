# HƯỚNG DẪN KẾT NỐI FACEBOOK & INSTAGRAM QUA MAKE.COM (CHI TIẾT)

Tài liệu này hướng dẫn bạn cách thiết lập luồng đẩy dữ liệu tự động từ **Facebook & Instagram Lead Ads** về hệ thống CRM của bạn bằng công cụ trung gian **Make.com**.

---

### 🚀 QUY TRÌNH TỰ ĐỘNG HÓA CHI TIẾT

#### BƯỚC 1: LẤY LINK WEBHOOK TỪ CRM
Đây là "địa chỉ nhà" của CRM để Make.com biết nơi gửi dữ liệu đến.
1.  Truy cập vào trang **Quản lý chiến dịch** trên CRM.
2.  Mở mục **Kết nối nguồn Lead** > Tab **Facebook**.
3.  Tại phần **"Cách 1: Kết nối nhanh"**, hãy nhấn nút **Copy** để sao chép đường link Webhook.
    *   *Ví dụ: `https://your-domain.com/api/marketing/leads/webhook/facebook`*

#### BƯỚC 2: THIẾT LẬP SCENARIO TRÊN MAKE.COM
Scenario giống như một robot tự động làm việc cho bạn 24/7.
1.  Đăng nhập vào [Make.com](https://www.make.com/).
2.  Nhấn nút **Create a new scenario** ở góc trên bên phải.
3.  Nhấn vào dấu cộng lớn (+), tìm kiếm module **Facebook Lead Ads**.
4.  Chọn Trigger: **Watch Leads** (Tự động kích hoạt khi có lead mới).

#### BƯỚC 3: KẾT NỐI FANPAGE VÀ CHỌN FORM
Robot cần biết nó phải canh chừng ở Trang nào và Mẫu (Form) quảng cáo nào.
1.  Nhấn **Add** để kết nối tài khoản Facebook cá nhân của bạn (Tài khoản phải là Quản trị viên của Fanpage).
2.  **Page**: Chọn chính xác Fanpage đang chạy quảng cáo.
3.  **Form**: Chọn **"All"** nếu muốn lấy từ tất cả quảng cáo, hoặc chọn đích danh một mẫu bạn muốn.
4.  Nhấn **OK**.

#### BƯỚC 4: CẤU HÌNH MODULE HTTP (ĐẨY DỮ LIỆU)
Đây là bước quan trọng nhất để "bắc cầu" dữ liệu từ Facebook về hệ thống CRM của bạn.
1.  Nhấn vào nút **"Add another module"** (Dấu cộng bên cạnh module Facebook), tìm module **HTTP**.
2.  Chọn Action: **Make a request**.
3.  Cấu hình chính xác như sau:
    *   **URL**: Dán link Webhook bạn đã copy ở Bước 1.
    *   **Method**: Chọn **POST**.
    *   **Body content type**: Chọn **Raw**.
    *   **Content type**: Chọn **JSON (application/json)**.
    *   **Body content**: Copy đoạn mã JSON dưới đây:

```json
{
  "fullName": "{{1.full_name}}",
  "phone": "{{1.phone_number}}",
  "email": "{{1.email}}",
  "campaignExternalId": "{{1.campaign_id}}",
  "externalId": "{{1.ad_id}}",
  "source": "facebook_make"
}
```

**Lưu ý RẤT QUAN TRỌNG:** Trong đoạn mã JSON trên, các giá trị trong dấu ngoặc `{{...}}` chỉ là tên minh họa. Bạn cần xóa phần trong dấu ngoặc đó đi, sau đó dùng chuột **click chọn đúng các trường dữ liệu tương ứng** từ danh sách gợi ý mà Make.com hiển thị.

#### BƯỚC 5: KIỂM TRA VÀ KÍCH HOẠT
1.  Nhấn **Run once** ở góc dưới bên trái Make.com.
2.  Sử dụng [Facebook Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing) để gửi một lead thử nghiệm.
3.  Nếu Module HTTP hiện vòng tròn xanh lá và CRM nhận được lead mới -> Thành công.
4.  Gạt nút **Scheduling** (ở dưới cùng bên trái) sang **ON** để robot bắt đầu làm việc 24/7.

---

### 💡 CÁC LỖI THƯỜNG GẶP
*   **Lỗi 403 Forbidden**: Do tài khoản chưa có quyền "Lead Access" trên Facebook Business Suite. Hãy vào *Business Settings > Integrations > Lead Access* để cấp quyền.
*   **Dữ liệu không về CRM**: Kiểm tra lại URL Webhook ở Bước 4 xem đã chính xác chưa (phải bắt đầu bằng `https://`).
*   **Lead bị trống tên/SĐT**: Kiểm tra xem Form trên Facebook có đúng tên trường là `full_name` và `phone_number` không.
