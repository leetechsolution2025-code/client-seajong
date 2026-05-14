const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.warehouse.update({
    where: { code: 'KVP' },
    data: { type: 'MATERIAL' }
  });
  await prisma.warehouse.update({
    where: { code: 'KHO-LOI' },
    data: { type: 'DEFECT' }
  });
  // Default is PRODUCT, but let's be explicit
  await prisma.warehouse.updateMany({
    where: { code: { in: ['KHO-CHINH', 'KHO-DAIMO'] } },
    data: { type: 'PRODUCT' }
  });
  console.log('Warehouses updated');
}

main().finally(() => prisma.$disconnect());
