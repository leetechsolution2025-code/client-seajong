# Giải pháp thiết kế và triển khai: Điều chuyển và Đề bạt

Tài liệu này mô tả kế hoạch triển khai module Quản lý Điều chuyển và Đề bạt nhân sự trong hệ thống HR.

## 1. Quy trình nghiệp vụ (3 Bước)

Hệ thống sẽ gộp 6 bước nghiệp vụ truyền thống thành 3 giai đoạn chính trên giao diện sử dụng `ModernStepper`:

1.  **Tiếp nhận (Receipt và HR Approval)**: 
    *   Phòng nhân sự tiếp nhận các đề xuất điều chuyển/đề bạt.
    *   Phê duyệt sơ bộ qua Offcanvas để chuyển sang giai đoạn phỏng vấn.
2.  **Phỏng vấn (Interview và Evaluation)**: 
    *   Hỗ trợ ghi nhận kết quả phỏng vấn, đánh giá năng lực và sự phù hợp.
    *   Tổng hợp kết quả để trình Giám đốc phê duyệt.
3.  **Kết luận (Conclusion và Data Sync)**: 
    *   Hiển thị danh sách các trường hợp được Giám đốc đồng ý.
    *   Hỗ trợ ban hành thông báo và tự động cập nhật dữ liệu vào hồ sơ nhân viên gốc.

## 2. Nguyên tắc thiết kế

- **Ngôn ngữ**: Tuyệt đối không sử dụng ký tự `&`, thay thế hoàn toàn bằng từ "và".
- **Giao diện**:
    - Sử dụng `PageHeader` ở đầu trang.
    - Sử dụng `ModernStepper` để điều hướng quy trình.
    - Sử dụng `Table` để hiển thị danh sách nhân sự ở từng bước.
    - Sử dụng `Offcanvas` cho các thao tác chi tiết (chiến thuật List-Detail).
- **Tính nhất quán**: Đảm bảo trải nghiệm tương đồng với module Đào tạo (`hr/training`).

## 3. Các thành phần chính (Components)

- `page.tsx`: Quản lý trạng thái bước (`currentStep`), dữ liệu và hiển thị bảng.
- `PromotionOffcanvas.tsx`: Xử lý logic nghiệp vụ cho từng bước (Duyệt, Lưu kết quả phỏng vấn, Cập nhật hồ sơ).
- `types.ts`: Định nghĩa các interface dữ liệu cho đề xuất điều chuyển.

## 4. Kế hoạch thực hiện

1.  Khởi tạo cấu trúc thư mục và các kiểu dữ liệu (Types).
2.  Xây dựng thành phần `PromotionOffcanvas`.
3.  Hoàn thiện giao diện chính `page.tsx` với Stepper và Table.
4.  Kiểm tra và hoàn thiện luồng dữ liệu.
