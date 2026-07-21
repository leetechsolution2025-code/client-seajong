import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu xoá dữ liệu trong kho thành phẩm và kho vật tư phụ kiện...');

  // 1. Delete all MaterialItems
  const deletedMaterials = await prisma.materialItem.deleteMany({});
  console.log(`- Đã xoá ${deletedMaterials.count} vật tư/phụ kiện.`);

  // 2. Delete all ManufacturedProducts
  const deletedProducts = await prisma.manufacturedProduct.deleteMany({});
  console.log(`- Đã xoá ${deletedProducts.count} thành phẩm.`);

  // 3. Clear InventoryStock for KHO-THANHPHAM and KVP
  const deletedInventoryStocks = await prisma.inventoryStock.deleteMany({
    where: {
      warehouseId: {
        in: ['KHO-THANHPHAM', 'KVP']
      }
    }
  });
  console.log(`- Đã xoá ${deletedInventoryStocks.count} bản ghi tồn kho trong KHO-THANHPHAM và KVP.`);

  // 4. Clear MaterialStock just in case there are orphaned records
  try {
    const deletedMaterialStocks = await prisma.materialStock.deleteMany({
        where: {
        warehouseId: {
            in: ['KHO-THANHPHAM', 'KVP']
        }
        }
    });
    console.log(`- Đã xoá ${deletedMaterialStocks.count} bản ghi MaterialStock trong KHO-THANHPHAM và KVP.`);
  } catch (e) {
      // Table might not have this relation directly or might be handled by cascade
  }

  // Also clear stock movements related to these warehouses to avoid orphaned references
  const deletedMovements = await prisma.stockMovement.deleteMany({
    where: {
      OR: [
        { fromWarehouseId: { in: ['KHO-THANHPHAM', 'KVP'] } },
        { toWarehouseId: { in: ['KHO-THANHPHAM', 'KVP'] } }
      ]
    }
  });
  console.log(`- Đã xoá ${deletedMovements.count} bản ghi lịch sử xuất/nhập kho liên quan.`);

  console.log('Hoàn tất xoá dữ liệu!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
