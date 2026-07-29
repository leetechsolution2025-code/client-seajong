import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const code = 'nsp-voi';
  const items = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { category: { code: code } },
        { erpCategory: { code: code } }
      ]
    },
    select: { tenHang: true }
  });
  console.log("Found items:", items.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
