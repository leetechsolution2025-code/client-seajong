# Quy trình Cập nhật & Kiểm định Chất lượng (IQC / OQC)

Tài liệu này mô tả chi tiết quy trình nghiệp vụ tự động diễn ra khi nhân viên kiểm định nhấn nút **Lưu** trên giao diện biên bản kiểm định chất lượng (IQC/OQC).

---

## 1. Cập nhật Trạng thái Phiếu
- Trạng thái của phiếu kiểm định chất lượng (`QualityInspection`) tự động chuyển sang **"Đã hoàn thành"** (`status: "Đã hoàn thành"`).
- Ghi nhận người thực hiện kiểm định (`inspectorName`).
- Lưu trữ danh sách chi tiết hàng hóa (chứa nội dung nhận xét chi tiết của QC cho từng mặt hàng) vào cột `metadata` dưới dạng JSON.

## 2. Phân loại Hàng hóa Kiểm định
Hệ thống tự động phân tách danh sách hàng hoá/vật tư trong phiếu thành 2 danh sách riêng biệt:
1. **Danh sách sản phẩm Đạt**: Gồm các sản phẩm có số lượng đạt thực tế lớn hơn 0 (`passQuantity > 0`).
2. **Danh sách sản phẩm Lỗi**: Gồm các sản phẩm có số lượng lỗi thực tế lớn hơn 0 (`failQuantity > 0`).

## 3. Tự động Tạo các Lệnh Nhập Kho
Dựa trên kết quả phân loại trên, hệ thống sẽ tự động tạo các công việc (Task) nhập kho gửi đến bộ phận Kho vận (Thủ kho):

- **Trường hợp tất cả đạt (Không có sản phẩm lỗi)**:
  - Sinh 1 lệnh nhập kho duy nhất.
  - Hàng đạt sẽ được nhập vào kho **KVP** (Kho Vật tư phụ kiện đối với IQC) hoặc kho **Thành phẩm** (đối với OQC).

- **Trường hợp tất cả lỗi (Không có sản phẩm đạt)**:
  - Sinh 1 lệnh nhập kho duy nhất.
  - Hàng lỗi sẽ được nhập vào **Kho hàng lỗi (KHO-LOI)**.

- **Trường hợp có cả đạt và lỗi (Hỗn hợp)**:
  - Sinh **đồng thời cả 2 lệnh nhập kho** độc lập:
    1. Lệnh nhập hàng đạt vào kho **KVP** (đối với IQC) hoặc kho **Thành phẩm** (đối với OQC).
    2. Lệnh nhập hàng lỗi vào kho **KHO-LOI**.

## 4. Phát thông báo tự động (Notifications)
Gửi các thông báo đến 3 bộ phận liên quan:
1. **Bộ phận Sản xuất**:
   - Nhận thông báo kết quả kiểm tra vật tư (IQC) để biết vật tư đã sẵn sàng đưa vào sản xuất hay chưa, hoặc thành phẩm sản xuất ra (OQC) đạt hay lỗi để xử lý.
2. **Bộ phận Kế toán**:
   - Nhận thông báo để theo dõi biến động tài sản vật tư/thành phẩm nhập kho, xử lý đối chiếu công nợ và hàng trả nhà cung cấp (trong trường hợp vật tư lỗi).
3. **Bộ phận Kho vận (Thủ kho)**:
   - Nhận thông báo nhắc nhở tiến hành nhập kho theo các lệnh đã sinh ra ở Bước 3.
