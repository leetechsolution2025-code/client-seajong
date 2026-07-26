import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.inventoryItem.updateMany({
    where: { 
      webProductId: { not: null },
      donVi: "cái"
    },
    data: {
      donVi: "bộ"
    }
  });
  console.log(`Updated ${result.count} items from "cái" to "bộ".`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
