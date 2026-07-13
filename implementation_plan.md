# Tách riêng danh mục Kho thành phẩm sang bảng Category

Theo yêu cầu, kho thành phẩm sẽ được tách ra quản lý danh mục riêng biệt trong bảng `Category` (không chung đụng với `InventoryCategory` của kho vật tư/hàng hoá khác), đồng thời đảm bảo không mất dữ liệu hiện tại khi cập nhật lên server.

## User Review Required

> [!IMPORTANT]
> Việc thay đổi cấu trúc bảng liên quan đến khoá ngoại (Foreign Key) rất dễ gây mất dữ liệu nếu dùng lệnh `prisma db push` trực tiếp. Do đó, tôi đề xuất tạo thêm một cột mới `productCategoryId` thay vì đổi trực tiếp cột `categoryId` hiện tại, để di chuyển dữ liệu an toàn 100%.

## Proposed Changes

### Prisma Schema

#### [MODIFY] [schema.prisma](file:///Users/leanhvan/client-seajong/prisma/schema.prisma)
- Thêm cột `productCategoryId String?` vào model `ManufacturedProduct`.
- Thêm relation `productCategory` liên kết tới model `Category`.
- Giữ nguyên cột `categoryId` (tạm thời) để không bị lỗi khoá ngoại khi chưa migrate data.

### Data Migration Script (Chạy 1 lần)

#### [NEW] [migrate_mfp_categories.ts](file:///Users/leanhvan/client-seajong/scripts/migrate_mfp_categories.ts)
- Script thực hiện:
  1. Tạo nhóm danh mục mới `danh_muc_thanh_pham` trong `CategoryTypeDef`.
  2. Sao chép các danh mục thành phẩm hiện tại từ `InventoryCategory` sang bảng `Category`.
  3. Cập nhật `productCategoryId` cho tất cả các `ManufacturedProduct` tương ứng.

### API & Components

#### [MODIFY] [api/production/manufactured-products/categories/route.ts](file:///Users/leanhvan/client-seajong/src/app/api/production/manufactured-products/categories/route.ts)
- Thay đổi logic truy vấn sang bảng `Category` với điều kiện `type = 'danh_muc_thanh_pham'`.

#### [MODIFY] [api/production/materials/categories/route.ts](file:///Users/leanhvan/client-seajong/src/app/api/production/materials/categories/route.ts)
- Khi fetch danh mục cho `KHO-THANHPHAM`, sẽ lấy từ bảng `Category` với `type = 'danh_muc_thanh_pham'` thay vì `InventoryCategory`.

#### [MODIFY] [api/production/manufactured-products/route.ts](file:///Users/leanhvan/client-seajong/src/app/api/production/manufactured-products/route.ts)
- Thay đổi `categoryId` thành `productCategoryId` khi tạo mới hoặc lấy danh sách sản phẩm.

#### [MODIFY] [src/components/production/inventory/...](file:///Users/leanhvan/client-seajong/src/components/production/inventory)
- Cập nhật các component liên quan để gửi/nhận `productCategoryId` thay vì `categoryId`.

## Verification Plan

### Automated Tests
- Chạy thử script migrate trên local database.
- Xác minh `ManufacturedProduct` vẫn giữ nguyên danh mục.

### Manual Verification
- Sẽ yêu cầu user kiểm tra lại trên localhost xem danh sách Thành phẩm đã hiển thị đúng danh mục mới chưa trước khi thực thi `update.sh` lên server.
