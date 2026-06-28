import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== ENSURING DEFAULT WAREHOUSES EXIST ===");

  // 1. Tạo/cập nhật 3 kho mặc định
  const kp = await prisma.warehouse.upsert({
    where: { code: "KHO-THANHPHAM" },
    update: { name: "Kho thành phẩm", type: "PRODUCT", isActive: true },
    create: { code: "KHO-THANHPHAM", name: "Kho thành phẩm", type: "PRODUCT", address: "Cụm 4, Xã Sơn Đồng, Hà Nội", isActive: true }
  });
  console.log(`- Kho thành phẩm: ID = ${kp.id}`);

  const kvt = await prisma.warehouse.upsert({
    where: { code: "KHO-PHUKIEN" },
    update: { name: "Kho vật tư phụ kiện", type: "MATERIAL", isActive: true },
    create: { code: "KHO-PHUKIEN", name: "Kho vật tư phụ kiện", type: "MATERIAL", address: "Khu vực lưu trữ vật tư", isActive: true }
  });
  console.log(`- Kho vật tư phụ kiện: ID = ${kvt.id}`);

  const kloi = await prisma.warehouse.upsert({
    where: { code: "KHO-LOI" },
    update: { name: "Kho hàng lỗi", type: "DEFECT", isActive: true },
    create: { code: "KHO-LOI", name: "Kho hàng lỗi", type: "DEFECT", address: "Khu vực cách ly kỹ thuật", isActive: true }
  });
  console.log(`- Kho hàng lỗi: ID = ${kloi.id}`);

  // 2. Gom và chuyển đổi dữ liệu từ các kho khác sang 3 kho mặc định này
  const otherWarehouses = await prisma.warehouse.findMany({
    where: {
      code: { notIn: ["KHO-THANHPHAM", "KHO-PHUKIEN", "KHO-LOI"] }
    }
  });

  console.log(`=== FOUND ${otherWarehouses.length} OTHER WAREHOUSES TO MERGE & DELETE ===`);

  for (const wh of otherWarehouses) {
    console.log(`Processing warehouse: ${wh.name} (${wh.code}) [ID: ${wh.id}]`);

    // Phân tích loại kho để chuyển dữ liệu vào kho đích mặc định
    let targetWhId = kp.id;
    if (wh.type === "MATERIAL") {
      targetWhId = kvt.id;
    } else if (wh.type === "DEFECT") {
      targetWhId = kloi.id;
    }

    // A. Chuyển đổi bảng InventoryStock
    const stocks = await prisma.inventoryStock.findMany({ where: { warehouseId: wh.id } });
    for (const stock of stocks) {
      const targetStock = await prisma.inventoryStock.findFirst({
        where: { warehouseId: targetWhId, inventoryItemId: stock.inventoryItemId }
      });

      if (targetStock) {
        await prisma.inventoryStock.update({
          where: { id: targetStock.id },
          data: { soLuong: targetStock.soLuong + stock.soLuong }
        });
        await prisma.inventoryStock.delete({ where: { id: stock.id } });
      } else {
        await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: { warehouseId: targetWhId }
        });
      }
    }

    // B. Chuyển đổi bảng MaterialStock
    const matStocks = await prisma.materialStock.findMany({ where: { warehouseId: wh.id } });
    for (const ms of matStocks) {
      const targetMS = await prisma.materialStock.findFirst({
        where: { warehouseId: targetWhId, materialId: ms.materialId }
      });

      if (targetMS) {
        await prisma.materialStock.update({
          where: { id: targetMS.id },
          data: { soLuong: targetMS.soLuong + ms.soLuong }
        });
        await prisma.materialStock.delete({ where: { id: ms.id } });
      } else {
        await prisma.materialStock.update({
          where: { id: ms.id },
          data: { warehouseId: targetWhId }
        });
      }
    }

    // C. Chuyển đổi bảng StockMovement
    await prisma.stockMovement.updateMany({
      where: { fromWarehouseId: wh.id },
      data: { fromWarehouseId: targetWhId }
    });
    await prisma.stockMovement.updateMany({
      where: { toWarehouseId: wh.id },
      data: { toWarehouseId: targetWhId }
    });

    // D. Chuyển đổi bảng StockCount và StockCountLine
    await prisma.stockCount.updateMany({
      where: { warehouseId: wh.id },
      data: { warehouseId: targetWhId }
    });
    await prisma.stockCountLine.updateMany({
      where: { warehouseId: wh.id },
      data: { warehouseId: targetWhId }
    });

    // E. Cuối cùng, xóa kho hàng cũ
    await prisma.warehouse.delete({
      where: { id: wh.id }
    });
    console.log(`Deleted warehouse ${wh.name} (${wh.code})`);
  }

  console.log("=== FINISHED CLEANING WAREHOUSES ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
