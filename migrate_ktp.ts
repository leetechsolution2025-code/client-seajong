import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.manufacturedProduct.updateMany({
    where: { defaultWarehouse: "KTP" },
    data: { defaultWarehouse: "KHO-THANHPHAM" }
  });
  console.log(`Successfully updated ${result.count} products.`);
}

main().finally(() => prisma.$disconnect());
