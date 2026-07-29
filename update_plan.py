import re
with open("/Users/leanhvan/.gemini/antigravity-ide/brain/64925c3d-5db2-4fda-9ebc-05d0dff54916/implementation_plan.md", "r") as f:
    c = f.read()

c = """# Gộp Model Hàng Hoá và Fix Các Lỗi Quy Trình

## Hoàn thành
- [x] Đã gộp toàn bộ `MaterialItem`, `ManufacturedProduct` thành `InventoryItem` duy nhất trong schema Prisma.
- [x] Đã sửa đổi 100% các API liên quan (Inventory, Sales, Purchase, BOM, Dashboard...).
- [x] Đã build thành công dự án (`npm run build`) không còn bất kỳ lỗi TypeScript nào liên quan đến các model cũ.

## Các bước tiếp theo

### 1. Xử lý Offcanvas Kế toán duyệt đơn hàng
- **Vấn đề**: Kế toán phàn nàn phải sản xuất thêm phần thiếu nếu mặt hàng có định mức, và nếu mặt hàng không có định mức thì phải gửi cho mua hàng.
- **Giải pháp**: 
  - Trong Offcanvas duyệt đơn, khoá checkbox "Tạo Lệnh Sản Xuất" đối với các mặt hàng **không có định mức** (`dinhMucs.length === 0`).
  - Tự động sinh yêu cầu mua hàng (Purchase Request) đối với các mặt hàng thiếu nhưng không thể sản xuất (không có định mức).

### 2. Sửa lỗi đồ thị doanh số
- **Vấn đề**: Đơn hàng duyệt rồi nhưng doanh số trên biểu đồ Dashboard không hiển thị.
- **Giải pháp**: Kiểm tra API `/api/sales/dashboard` hoặc `/api/plan-finance/stats` để đảm bảo query tổng doanh thu đang filter đúng trạng thái (`trangThai` của đơn hàng sau khi kế toán duyệt).

### 3. Review Số lượng Tồn Kho trên UI
- **Vấn đề**: Số lượng tồn kho bị sai hoặc hiển thị có vấn đề.
- **Giải pháp**: Do đã gộp model thành `InventoryItem` và sử dụng `InventoryStock`, cần kiểm tra lại logic hiển thị tổng tồn kho trong bảng Logistics và Sales để đảm bảo `stocks` (InventoryStock) được sum đúng theo từng kho.

### 4. Xoá kho thành phẩm theo yêu cầu
- Xoá hoặc gộp các Warehouse không cần thiết (KHO-THANHPHAM) theo đúng chỉ thị "xoá luôn cái kho thành phẩm đi cho đỡ lằng nhằng".
"""

with open("/Users/leanhvan/.gemini/antigravity-ide/brain/64925c3d-5db2-4fda-9ebc-05d0dff54916/implementation_plan.md", "w") as f:
    f.write(c)

