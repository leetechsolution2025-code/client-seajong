import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: '01V' },
    include: { erpCategory: true, category: true }
  });
  console.log("Item 01V:", item?.erpCategory?.name, item?.category?.name, "Codes:", item?.erpCategory?.code, item?.category?.code);

  const lavaboOEMCat = await prisma.category.findFirst({
    where: { name: { contains: 'Vòi Lavabo OEM' } }
  });
  console.log("Lavabo OEM Category:", lavaboOEMCat);
}

main().catch(console.error).finally(() => prisma.$disconnect());
