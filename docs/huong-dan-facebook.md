# HƯỚNG DẪN KẾT NỐI FACEBOOK LEAD ADS QUA MAKE.COM
Tài liệu này hướng dẫn bạn cách thiết lập luồng đẩy dữ liệu tự động từ Facebook Lead Ads về hệ thống CRM của bạn bằng công cụ trung gian Make.com (trước đây là Integromat).

## 📋 Điều kiện cần có
- Tài khoản Make.com (Gói Free là đủ dùng).
- Tài khoản Facebook có quyền Quản trị viên của Fanpage.
- Quyền Lead Access trong Facebook Business Suite (để xem được dữ liệu lead).

## 🚀 Các bước thực hiện
### Bước 1: Lấy Link Webhook từ CRM
- Truy cập vào trang Quản lý chiến dịch trên CRM.
- Mở mục Kết nối nguồn Lead.
- Tại tab Facebook, phần "Cách 1: Kết nối nhanh", hãy nhấn nút Copy để sao chép đường link Webhook (Ví dụ: https://your-domain.com/api/marketing/leads/webhook/facebook).

### Bước 2: Tạo Scenario trên Make.com
- Đăng nhập vào Make.com.
- Nhấn nút Create a new scenario ở góc trên bên phải.
- Nhấn vào dấu cộng lớn, tìm kiếm module Facebook Lead Ads.
- Chọn Action: Watch Leads (Trình kích hoạt khi có lead mới).

### Bước 3: Cấu hình Facebook Module
- Nhấn Add để kết nối tài khoản Facebook của bạn.
- Sau khi kết nối, hãy chọn:
  - Page: Trang Fanpage đang chạy quảng cáo.
  - Form: Chọn "All forms" hoặc một form cụ thể.
- Nhấn OK.

### Bước 4: Thêm Module HTTP để đẩy dữ liệu về CRM
- Nhấn vào biểu tượng "nửa vầng trăng" bên cạnh module Facebook để thêm module mới.
- Tìm kiếm module HTTP.
- Chọn Action: Make a request.
- Cấu hình module HTTP như sau:
  - URL: Dán đường link Webhook bạn đã copy ở Bước 1.
  - Method: Chọn POST.
  - Body type: Chọn Raw.
  - Content type: Chọn JSON (application/json).
  - Request content: Copy đoạn mã dưới đây và dán vào:

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

**Lưu ý**: Các phần trong ngoặc {{...}} là các biến từ Facebook. Hãy xóa các biến mẫu của tôi và dùng chuột click vào các trường tương ứng mà Make.com gợi ý từ module Facebook.

### Bước 5: Kích hoạt và Kiểm tra
- Nhấn Run once ở góc dưới bên trái Make.com.
- Sử dụng Facebook Lead Ads Testing Tool để gửi một lead thử nghiệm.
- Nếu Module HTTP hiện màu xanh và CRM nhận được lead mới -> Thành công.
- Gạt nút Scheduling sang ON để hệ thống chạy tự động 24/7.

## 💡 Các lỗi thường gặp
- **Lỗi 403 (Forbidden)**: Do tài khoản chưa có quyền "Lead Access" trên Business Suite. Hãy vào Business Settings > Integrations > Lead Access để cấp quyền cho tài khoản đang kết nối.
- **Dữ liệu trả về trống**: Kiểm tra xem Form trên Facebook có đúng các trường full_name, phone_number không.
- **CRM không hiện lead**: Kiểm tra URL Webhook xem đã chính xác chưa (phải bắt đầu bằng https://).

---
*Chúc bạn thành công! Nếu gặp khó khăn, hãy liên hệ bộ phận kỹ thuật.*
