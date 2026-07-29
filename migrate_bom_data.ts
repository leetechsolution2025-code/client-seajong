import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Migrating DinhMucVatTu...");
  const dmvts = await prisma.dinhMucVatTu.findMany({
    include: { material: true }
  });

  let migratedCount = 0;
  for (const dmvt of dmvts) {
    if (dmvt.material && dmvt.material.code) {
      const invItem = await prisma.inventoryItem.findFirst({
        where: { code: dmvt.material.code }
      });
      if (invItem) {
        await prisma.dinhMucVatTu.update({
          where: { id: dmvt.id },
          data: { inventoryItemId: invItem.id }
        });
        migratedCount++;
      }
    }
  }
  console.log(`Migrated ${migratedCount} DinhMucVatTu records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
