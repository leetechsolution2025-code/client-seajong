const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Tìm 2 sản phẩm
  const correctItem = await prisma.inventoryItem.findFirst({
    where: { code: "01S" }
  });
  const wrongItem = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: "Voriger" } }
  });

  if (!correctItem || !wrongItem) {
    console.error("Không tìm thấy sản phẩm tương ứng trong db", { correctItem, wrongItem });
    return;
  }

  // 2. Tìm Kho thương mại (KHO-CHINH) và Kho sản xuất (KVP)
  const khoChinh = await prisma.warehouse.findFirst({ where: { code: "KHO-CHINH" } });
  const khoKvp = await prisma.warehouse.findFirst({ where: { code: "KVP" } });

  if (!khoChinh || !khoKvp) {
    console.error("Không tìm thấy kho tương ứng trong db", { khoChinh, khoKvp });
    return;
  }

  console.log("Sản phẩm đúng:", correctItem.tenHang, "(ID:", correctItem.id, ")");
  console.log("Sản phẩm sai:", wrongItem.tenHang, "(ID:", wrongItem.id, ")");

  await prisma.$transaction(async (tx) => {
    // A. Trừ 4 bộ của sản phẩm sai ở kho KVP về lại 0
    await tx.inventoryStock.upsert({
      where: { inventoryItemId_warehouseId: { inventoryItemId: wrongItem.id, warehouseId: khoKvp.id } },
      create: { inventoryItemId: wrongItem.id, warehouseId: khoKvp.id, soLuong: 0 },
      update: { soLuong: 0 }
    });
    await tx.inventoryItem.update({
      where: { id: wrongItem.id },
      data: { soLuong: 0, trangThai: "het-hang" }
    });

    // B. Cộng 4 bộ cho sản phẩm đúng ở kho KHO-CHINH
    await tx.inventoryStock.upsert({
      where: { inventoryItemId_warehouseId: { inventoryItemId: correctItem.id, warehouseId: khoChinh.id } },
      create: { inventoryItemId: correctItem.id, warehouseId: khoChinh.id, soLuong: 4 },
      update: { soLuong: 4 }
    });
    await tx.inventoryItem.update({
      where: { id: correctItem.id },
      data: { soLuong: 4, trangThai: "con-hang" }
    });
  });

  console.log("Đã sửa dữ liệu tồn kho thành công!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
