import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Bắt đầu dọn dẹp toàn bộ dữ liệu Hàng hoá & Vật tư...");

  // 1. Xoá các bảng con (phụ thuộc) trước
  console.log("Đang xoá DinhMucVatTu...");
  await prisma.dinhMucVatTu.deleteMany({});

  console.log("Đang xoá DinhMuc...");
  await prisma.dinhMuc.deleteMany({});

  console.log("Đang xoá StockMovement (Lịch sử kho)...");
  await prisma.stockMovement.deleteMany({});

  console.log("Đang xoá InventoryStock (Tồn kho)...");
  await prisma.inventoryStock.deleteMany({});

  console.log("Đang xoá ManufacturedProduct (Thành phẩm)...");
  try { await (prisma as any).manufacturedProduct.deleteMany({}); } catch (e) {}

  // 2. Xoá bảng cha
  console.log("Đang xoá MaterialItem...");
  try { await (prisma as any).materialItem.deleteMany({}); } catch (e) {}

  console.log("Đang xoá toàn bộ InventoryItem (Hàng hoá/Vật tư)...");
  await prisma.inventoryItem.deleteMany({});

  console.log("✅ Đã xoá sạch sẽ toàn bộ dữ liệu! Hệ thống đã sẵn sàng để Import lại từ Excel.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
