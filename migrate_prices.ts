import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.manufacturedProduct.findMany({
    where: { giaBan: { gt: 0 } },
    include: { dinhMucs: true }
  });
  
  let count = 0;
  for (const p of products) {
    if (p.giaBan && p.dinhMucs.length > 0) {
      for (const dm of p.dinhMucs) {
        await prisma.dinhMuc.update({
          where: { id: dm.id },
          data: { giaBan: p.giaBan }
        });
        count++;
      }
    }
  }
  console.log(`Migrated ${count} prices to DinhMuc.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
