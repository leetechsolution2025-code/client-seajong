import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const t1 = await (prisma as any).inventoryItem.findFirst({ where: { tenHang: { contains: "Bồn tiểu nam" } } });
  console.log("InventoryItem:", t1?.id);
  const t2 = await (prisma as any).productCombo.findFirst({ where: { name: { contains: "Bồn tiểu nam" } } });
  console.log("ProductCombo:", t2?.id);
  const t3 = await (prisma as any).materialItem.findFirst({ where: { tenVatTu: { contains: "Bồn tiểu nam" } } });
  console.log("MaterialItem:", t3?.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
