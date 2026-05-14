# TÀI LIỆU QUẢN TRỊ HỆ THỐNG HÀNG HÓA SEAJONG

Tài liệu này lưu trữ các quy tắc và cấu trúc hệ thống quản lý kho vận (Logistics) và sản phẩm (Marketing) cho dự án Master Center.

## 1. Quy tắc đặt mã SKU (sj_generateSKU)
Mã SKU được chuẩn hóa theo thực tế trên Website seajong.com để đảm bảo tính nhất quán toàn hệ thống.
**Cấu trúc:** `SJ-[CATEGORY][MODEL][VERSION]-[COLOR]`

- **SJ:** Tiền tố thương hiệu cố định.
- **CATEGORY:** Mã danh mục viết hoa (Ví dụ: `BC` - Bồn cầu, `SC` - Sen cây, `VB` - Vòi bếp).
- **MODEL:** Số thứ tự model gồm 4 chữ số (Ví dụ: `0139`).
- **VERSION:** Phiên bản (tùy chọn, ví dụ: `B`, `PRO`).
- **COLOR:** Mã màu (tùy chọn, ví dụ: `SR` - Silver, `GR` - Grey).

*Ví dụ:* `SJ-BC0139B-SR`

---

## 2. Phân loại Hàng hóa Đa cấp
Hệ thống quản lý 4 nhóm hàng chính thông qua trường `inventory_type` trong bảng `Category`:

1. **Finished Goods (Sản phẩm/Thành phẩm):** Hàng bán trên website.
2. **Supplies (Vật tư):** Công cụ dụng cụ, đồ đóng gói (SKU bắt đầu bằng `VT-`).
3. **Raw Materials (Nguyên liệu):** Linh kiện lắp ráp (SKU bắt đầu bằng `NL-`).
4. **Defective (Hàng lỗi):** Quản lý theo trạng thái và kho riêng.

---

## 3. Chiến lược Quản lý Hàng lỗi
Để đảm bảo báo cáo tài chính và tồn kho chính xác:
- **Trạng thái:** Sử dụng trường `condition` (`New`, `Defective`, `Used`) trong bảng tồn kho.
- **Kho ảo:** Di chuyển hàng lỗi sang một kho chuyên biệt (Ví dụ: `KHO_LOI`) để tách biệt hoàn toàn với hàng bán sạch.
- **SKU Hàng lỗi:** Giữ SKU gốc và thêm hậu tố `-ERR` để dễ truy vết nguồn gốc model bị lỗi.

---

## 4. Cơ chế Đồng bộ với Seajong.com
Hệ thống sử dụng mô hình "Cầu nối dữ liệu" (Sync Bridge):
- **Source of Truth:** Dữ liệu gốc từ Website được lưu vào bảng `SeajongProduct`.
- **Mapping:** Bảng `InventoryItem` liên kết với dữ liệu web qua trường `webProductId`.
- **Sync Logic:** Khi đồng bộ, hệ thống cập nhật Tên, Ảnh, Giá niêm yết từ web vào kho nhưng vẫn giữ nguyên các thuộc tính quản trị kho (vị trí, loại hàng) đã cài đặt.

---

## 5. Cấu trúc Database nâng cấp (Prisma)
- **Category:** Thêm hỗ trợ `parentId` để lọc đa cấp (Parent -> Children).
- **InventoryItem:** Thêm các trường `type`, `brand`, `model`, `version`, `color`.
- **InventoryStock:** Thêm trường `condition`.
