import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cat = await prisma.inventoryCategory.findUnique({ where: { id: "cmrimw4v800048or1w55u9yhk" } });
  console.log(JSON.stringify(cat, null, 2));
}
main().finally(() => prisma.$disconnect());
