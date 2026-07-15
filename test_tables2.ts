import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const t1 = await prisma.inventoryItem.findFirst({ where: { tenHang: { contains: "Bồn tiểu nam" } } });
  console.log("InventoryItem Bồn Tiểu Nam:", JSON.stringify(t1, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
