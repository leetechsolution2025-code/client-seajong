const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const correctItem = await prisma.inventoryItem.findFirst({
    where: { code: "01S" }
  });

  if (!correctItem) {
    console.error("Không tìm thấy sản phẩm trong db");
    return;
  }

  const khoChinh = await prisma.warehouse.findFirst({ where: { code: "KHO-CHINH" } });
  const khoKvp = await prisma.warehouse.findFirst({ where: { code: "KVP" } });

  if (!khoChinh || !khoKvp) {
    console.error("Không tìm thấy kho tương ứng trong db");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Đặt KHO-CHINH của sản phẩm 01S về 0
    await tx.inventoryStock.upsert({
      where: { inventoryItemId_warehouseId: { inventoryItemId: correctItem.id, warehouseId: khoChinh.id } },
      create: { inventoryItemId: correctItem.id, warehouseId: khoChinh.id, soLuong: 0 },
      update: { soLuong: 0 }
    });

    // 2. Thiết lập KVP của sản phẩm 01S thành 4
    await tx.inventoryStock.upsert({
      where: { inventoryItemId_warehouseId: { inventoryItemId: correctItem.id, warehouseId: khoKvp.id } },
      create: { inventoryItemId: correctItem.id, warehouseId: khoKvp.id, soLuong: 4 },
      update: { soLuong: 4 }
    });

    // 3. Cập nhật tổng số lượng của InventoryItem (gộp KHO-CHINH và KVP)
    // Tổng = KHO-CHINH (0) + KVP (4) = 4
    await tx.inventoryItem.update({
      where: { id: correctItem.id },
      data: { soLuong: 4, trangThai: "con-hang" }
    });
  });

  console.log("Đã cập nhật 4 bộ sen 01S sang kho KVP thành công!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
