const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { 
      tenHang: { contains: 'hộp' },
      stocks: { some: { warehouse: { code: 'KVP' } } }
    },
    select: { tenHang: true, code: true, maThayThe: true }
  });
  console.log(items);
}

main().catch(console.error).finally(() => prisma.$disconnect());
