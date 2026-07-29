import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      tenHang: {
        contains: 'Sen tắm'
      }
    }
  });
  console.log("Items:", items);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
