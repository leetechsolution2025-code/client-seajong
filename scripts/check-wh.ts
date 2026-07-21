import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const wh = await prisma.warehouse.findFirst({
    where: { name: { contains: "Kho thành phẩm" } }
  });
  console.log("Warehouse:", wh);
}
main();
