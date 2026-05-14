# Giải pháp Quản trị Dự báo Nhu cầu & Điểm đặt hàng (ROP)

## 1. Mục tiêu cốt lõi
Xây dựng hệ thống quản trị kho khoa học cho ngành Thiết bị vệ sinh, giúp tối ưu hóa dòng tiền, chống đứt gãy chuỗi cung ứng (Out of stock) và hạn chế chôn vốn (Overstock).

---

## 2. Thuật toán Tính toán Điểm đặt hàng (ROP)
Hệ thống tự động tính toán ROP cho từng SKU dựa trên công thức:
**ROP = (D x LT) + SS**

Trong đó:
*   **D (Daily Demand):** Nhu cầu trung bình ngày. Tính toán dựa trên lịch sử bán hàng 30/60/90 ngày gần nhất.
*   **LT (Lead-time):** Thời gian nhập hàng. Bao gồm thời gian sản xuất và thời gian vận chuyển thực tế.
    *   *Lưu ý:* Áp dụng **Safety Lead-time** (Thời gian dự phòng) đặc biệt cho các biến động vận chuyển.
*   **SS (Safety Stock):** Tồn kho an toàn. Lượng hàng phòng thủ dựa trên độ lệch chuẩn của nhu cầu và biến động lead-time.

---

## 3. Cơ chế Quét tồn kho Sẵn dụng (Available Inventory)
Hệ thống không dựa trên tồn kho thực tế đơn thuần mà dựa trên số lượng sẵn dụng để đưa ra đề xuất:
**Tồn sẵn dụng = Tồn thực tế + Hàng đang về (PO) - Đơn khách đã đặt (Reserved)**

*   **Quy tắc:** Nếu `Tồn sẵn dụng ≤ ROP`, hệ thống tự động đưa sản phẩm vào danh sách đề xuất mua hàng.
*   **Loại trừ:** Tuyệt đối không tính hàng nằm trong kho Lỗi/Bảo hành vào con số sẵn dụng.

---

## 4. Tối ưu hóa Đơn mua hàng (EOQ & Grouping)
Hệ thống không đề xuất mua hàng lẻ tẻ mà thực hiện tối ưu hóa:
1.  **Gom nhóm theo Nhà cung cấp:** Tự động tập hợp các mã hàng dưới ngưỡng của cùng một NCC vào một "Dự thảo đơn mua hàng" (Draft PO).
2.  **Làm tròn theo Quy cách đóng gói:** Gợi ý số lượng mua dựa trên Pallet, Thùng (Box) hoặc Container để tối ưu chi phí vận chuyển.
3.  **Tối ưu tải trọng:** Gợi ý mua thêm các mã hàng sắp chạm ngưỡng ROP để lấp đầy xe tải/container, giảm chi phí logistics trên từng đơn vị sản phẩm.

---

## 5. Cấu trúc Giao diện (UI/UX)

### A. Dashboard Tổng quan (Tầng Intelligence)
*   **KPI Cards:** Cảnh báo mã hàng nguy cơ đứt hàng, tổng giá trị đơn hàng cần chi, hàng tồn chậm.
*   **Trend Alert:** Cảnh báo các mã hàng có tốc độ tiêu thụ tăng đột biến.

### B. Danh sách Đề xuất (Tầng Thực thi)
*   Bảng dữ liệu thông minh với các cột: SKU, Tồn sẵn dụng (Visual bar), ROP, Số lượng đề xuất, Lý do (e.g., "Khách đặt cọc", "Chạm ngưỡng tối thiểu").
*   Tính năng tạo nhanh đơn mua hàng từ danh sách đề xuất.

### C. Sidebar Phân tích (Tầng Analysis)
*   Hiển thị chi tiết cách tính ROP cho từng mã hàng.
*   Biểu đồ dòng chảy tồn kho dự kiến.
*   **Liên kết vật tư:** Cảnh báo nếu sản phẩm chính đủ nhưng vật tư đi kèm (gioăng, nắp, ốc vít) đang dưới ngưỡng ROP.

---

## 6. Tính năng Thích ứng (Adaptive Features)
*   **Global Lead-time Offset:** Cho phép điều chỉnh tăng Lead-time toàn hệ thống theo mùa vụ (ví dụ: tăng 5 ngày vào mùa lễ tết) để chủ động đặt hàng sớm.
*   **Supplier Logistics Health:** Đánh giá độ tin cậy vận chuyển của NCC dựa trên lịch sử giao hàng thực tế để tự động điều chỉnh Safety Stock.

---

## 7. Đặc thù ngành Thiết bị vệ sinh
*   **Quản trị theo bộ (BOM):** Hệ thống ROP cho sản phẩm hoàn chỉnh phải đi kèm với kiểm tra ROP cho các linh kiện vật tư lắp ráp.
*   **Loại trừ kho lỗi:** Đảm bảo dữ liệu mua hàng không bị nhiễu bởi hàng hỏng đang chờ xử lý.
