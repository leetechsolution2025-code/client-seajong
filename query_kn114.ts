import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({ where: { code: "KN114" } });
  console.log(JSON.stringify(item, null, 2));
}
main().finally(() => prisma.$disconnect());
