# HƯỚNG DẪN KẾT NỐI YOUTUBE ANALYTICS API (CHI TIẾT)

Tài liệu này hướng dẫn chi tiết cách tạo dự án trên **Google Cloud Console** và cấu hình **Native OAuth2** để tự động đồng bộ hóa các chỉ số hiệu quả từ kênh YouTube của bạn.

---

### 🚀 QUY TRÌNH THIẾT LẬP (10 - 15 PHÚT)

#### BƯỚC 1: TẠO DỰ ÁN (PROJECT) MỚI TRÊN GOOGLE CLOUD
Dự án là "vùng không gian" riêng để bạn quản lý việc kết nối dữ liệu. Bạn không nên dùng chung dự án với các dịch vụ khác.
1.  Truy cập: [console.cloud.google.com](https://console.cloud.google.com/)
2.  Ở thanh công cụ trên cùng, nhấn vào **danh sách Dự án** (thường nằm cạnh Logo Google Cloud).
3.  Nhấn vào nút **'NEW PROJECT'** (Dự án mới) ở góc trên bên phải cửa sổ hiện ra.
4.  Đặt tên dự án dễ nhớ (Ví dụ: 'Marketing CRM Analytics') và nhấn **CREATE**.

#### BƯỚC 2: KÍCH HOẠT CÁC API CẦN THIẾT
Mặc định Google Cloud không bật sẵn tính năng đọc dữ liệu Youtube, bạn cần phải "xin phép" thủ công.
1.  Tại thanh menu bên trái (nút 3 gạch), chọn **APIs & Services** > **Library**.
2.  Tìm kiếm từ khóa: **'YouTube Analytics API'** và nhấn vào kết quả. Nhấn nút **ENABLE**.
3.  Quay lại Library, tìm kiếm: **'YouTube Data API v3'** và cũng nhấn **ENABLE** (API này giúp hệ thống lấy tên kênh và avatar của bạn).

#### BƯỚC 3: CẤU HÌNH MÀN HÌNH ỦY QUYỀN (OAUTH CONSENT SCREEN)
Đây là màn hình sẽ hiện ra khi bạn đăng nhập tài khoản Google. Nó xác nhận bạn cho phép hệ thống đọc dữ liệu của bạn.
1.  Vào **APIs & Services** > **OAuth consent screen**.
2.  Chọn **User Type** là **External** (Để cho phép tài khoản Gmail cá nhân kết nối). Nhấn **Create**.
3.  **App Information**: Điền tên ứng dụng (VD: My CRM), email hỗ trợ và email liên hệ kỹ thuật của bạn.
4.  **Scopes**: Đây là bước quan trọng nhất. Nhấn **ADD OR REMOVE SCOPES**. Tìm và chọn 2 dòng:
    *   `.../auth/yt-analytics.readonly`
    *   `.../auth/youtube.readonly`
5.  **Test Users**: **RẤT QUAN TRỌNG**. Nhấn **ADD USERS** và điền chính xác địa chỉ Gmail quản lý kênh Youtube của bạn vào đây. Nếu không điền, bạn sẽ bị lỗi "Access Denied" khi đăng nhập.

#### BƯỚC 4: TẠO MÃ CLIENT ID VÀ CLIENT SECRET
Đây giống như là Tên đăng nhập và Mật khẩu bí mật để hệ thống CRM có thể "nói chuyện" với Google.
1.  Vào **APIs & Services** > **Credentials**.
2.  Nhấn **+ CREATE CREDENTIALS** > Chọn **OAuth client ID**.
3.  **Application type**: Chọn **Web application**.
4.  **Authorized redirect URIs**: Nhấn nút **ADD URI** và dán chính xác đường link Redirect URI mà hệ thống CRM cung cấp (Copy từ tab cấu hình).
5.  Nhấn **CREATE**. Một cửa sổ sẽ hiện ra chứa **Client ID** và **Client Secret**. Hãy copy 2 mã này để dán vào CRM.

#### BƯỚC 5: KẾT NỐI TRÊN CRM VÀ HOÀN TẤT
1.  Quay lại Dashboard CRM, dán **Client ID** và **Client Secret** vào Form cấu hình.
2.  Nhấn **Lưu cấu hình** để hệ thống ghi nhớ thông số.
3.  Nhấn nút **Kết nối tài khoản Google**.
4.  Đăng nhập bằng đúng tài khoản Gmail bạn đã thêm ở Bước 3.
5.  Nhấn **Allow (Cho phép)** khi Google hỏi quyền truy cập.

---

### 💡 CÁC LỖI THƯỜNG GẶP
*   **redirect_uri_mismatch**: Link dán vào Google Cloud ở Bước 4 phải khớp 100% với link trên CRM. Kiểm tra kỹ từng dấu gạch chéo `/`.
*   **Access Denied / 403 Forbidden**: Do bạn chưa thêm email vào mục **Test Users** ở Bước 3, hoặc dự án đang ở trạng thái "Testing" mà bạn dùng email khác để đăng nhập.
