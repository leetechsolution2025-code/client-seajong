# Kế hoạch triển khai: Luồng Thông Tin Bán Hàng (Sales Order Workflow)

Dựa trên yêu cầu của bạn, hệ thống sẽ tự động hóa luồng nghiệp vụ tạo đơn hàng, xét duyệt của kế toán, phân nhánh xuất kho (bán hàng sẵn có hoặc lắp ráp), và xuất kho.

## 1. Cập nhật Model Dữ Liệu (Prisma Schema)
Bổ sung một số trường vào model `SaleOrder` để hỗ trợ luồng này:
*   `ngayHoanThanhSanXuat`: (DateTime?) Lưu ngày hoàn thành sản xuất đối với hàng có lắp ráp do bộ phận Kinh doanh / Kế toán nhập vào.
*   Trạng thái đơn hàng (`trangThai`): Thêm hoặc chỉnh sửa các trạng thái `draft` (Mới), `active` (Đang thực hiện), `rejected` (Từ chối), `approved` (Đã duyệt), `in_production` (Đang sản xuất), `shipped` (Đã xuất hàng). 
*   Trạng thái Kế toán duyệt (`keToanDuyet`): `pending`, `approved`, `rejected`.

## 2. Cập nhật API Endpoint & Logic Nghiệp Vụ

### A. Khởi tạo Đơn Hàng (Bộ phận Kinh Doanh)
*   Tạo đơn hàng mới lưu vào DB với `trangThai = "active"`, `keToanDuyet = "pending"`.
*   Gửi `Notification` đến Bộ phận Kế toán báo có đơn mới cần duyệt. (Đã có sẵn một phần).

### B. Phê duyệt Đơn Hàng (Bộ phận Kế toán)
*   Tạo API PATCH `/api/plan-finance/sales/[id]/approve` hoặc tương tự.
*   **Từ chối**: Set `keToanDuyet = "rejected"`, `trangThai = "rejected"`. Gửi `Notification` phản hồi cho người lập đơn.
*   **Duyệt**:
    *   Set `keToanDuyet = "approved"`.
    *   Kiểm tra các sản phẩm trong đơn. Nếu có định mức (BOM) => Cần sản xuất.
    *   **Trường hợp Có sẵn**: Set `trangThai = "approved"`. Gửi Notification cho Thủ kho & Kinh doanh.
    *   **Trường hợp Cần Sản xuất (hoặc Hỗn hợp)**: Set `trangThai = "in_production"`. 
        * Gửi yêu cầu sản xuất cho Bộ phận Sản xuất kèm ngày hoàn thành.
        * Gửi danh sách vật tư cho Bộ phận Kho (KVP) để xuất vật tư.
        * Gửi Notification cho Kinh doanh.

### C. Hoàn thành Sản Xuất
*   Tạo API PATCH `/api/plan-finance/sales/[id]/production-complete`.
*   Bộ phận sản xuất cập nhật trạng thái đơn (hoặc hệ thống tự xử lý dựa vào task) -> Đổi `trangThai = "approved"` (sẵn sàng xuất).
*   Gửi Notification yêu cầu Thủ kho xuất hàng.

### D. Xuất Kho
*   Tạo API PATCH `/api/plan-finance/sales/[id]/ship`.
*   Thủ kho xác nhận xuất kho -> Đổi `trangThai = "shipped"`.
