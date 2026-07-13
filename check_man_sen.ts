import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.manufacturedProduct.findMany();
  const items = all.filter(x => x.name.toLowerCase().includes("sen"));
  console.log("ManufacturedProduct with sen:", items.length, items.map(x => x.name + ' - ' + x.code));
}
main().finally(() => prisma.$disconnect());
