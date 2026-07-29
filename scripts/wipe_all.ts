import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Bắt đầu dọn dẹp TOÀN BỘ dữ liệu liên quan đến Hàng hoá...");

  const tablesToClear = [
    'dinhMucVatTu',
    'manufacturedProduct',
    'stockMovement',
    'inventoryStock',
    'warehouseIssueDetail',
    'warehouseReceiptDetail',
    'qualityInspection',
    'inventoryCheckDetail',
    'productionOrderDetail',
    'purchaseOrderDetail',
    'quotationDetail',
    'salesOrderDetail',
    'saleOrderDetail',
    'retailInvoiceDetail',
    'logisticsTicketItem',
    'seajongProduct',
    'materialItem'
  ];

  for (const table of tablesToClear) {
    try {
      if ((prisma as any)[table]) {
        console.log(`Đang xoá ${table}...`);
        await (prisma as any)[table].deleteMany({});
      }
    } catch (e: any) {
      console.log(`Bỏ qua ${table}: ${e.message}`);
    }
  }

  // Delete main tables
  console.log("Đang xoá DinhMuc...");
  try { await prisma.dinhMuc.deleteMany({}); } catch(e) {}

  console.log("Đang xoá InventoryItem...");
  try {
    await prisma.inventoryItem.deleteMany({});
    console.log("✅ Đã xoá sạch sẽ toàn bộ dữ liệu InventoryItem!");
  } catch(e: any) {
    console.error("❌ Lỗi khi xoá InventoryItem:", e.message);
  }

  console.log("Hệ thống đã sẵn sàng để Import lại từ Excel.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
