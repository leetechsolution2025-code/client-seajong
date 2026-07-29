import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Checking InventoryItem inconsistencies...");
  const items = await prisma.inventoryItem.findMany();
  let itemInconsistencies = 0;
  for (const item of items) {
    const movements = await prisma.stockMovement.findMany({
      where: { inventoryItemId: item.id }
    });
    
    let calcStock = 0;
    movements.forEach(m => {
      if (m.type === 'nhap' || (m.type === 'dieu-chinh' && m.toWarehouseId)) calcStock += m.soLuong;
      if (m.type === 'xuat' || (m.type === 'dieu-chinh' && m.fromWarehouseId)) calcStock -= m.soLuong;
    });
    
    if (calcStock !== item.soLuong && movements.length > 0) {
      console.log(`InventoryItem ${item.code} (${item.tenHang}): Calculated=${calcStock}, Actual=${item.soLuong}`);
      itemInconsistencies++;
    }
  }
  console.log(`Found ${itemInconsistencies} inconsistencies in InventoryItem.\n`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
