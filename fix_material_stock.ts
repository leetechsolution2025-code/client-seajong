import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mats = await prisma.materialItem.findMany();
  let updated = 0;
  for (const mat of mats) {
    const inv = await prisma.inventoryItem.findFirst({ where: { code: mat.code }, include: { stocks: true } });
    if (inv) {
      // Sync all InventoryStock to MaterialStock
      for (const st of inv.stocks) {
        await prisma.materialStock.upsert({
          where: { materialId_warehouseId: { materialId: mat.id, warehouseId: st.warehouseId } },
          create: { materialId: mat.id, warehouseId: st.warehouseId, soLuong: st.soLuong, soLuongMin: 0 },
          update: { soLuong: st.soLuong }
        });
      }
      updated++;
    }
  }
  console.log(`Synced MaterialStock for ${updated} materials.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
