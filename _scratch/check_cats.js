const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.inventoryCategory.findMany({
    select: { id: true, name: true, code: true }
  });
  console.log('Categories:', all);
  
  const targetId = 'cmovtn76s0000gnz3b6yof4p0';
  const exists = all.find(c => c.id === targetId);
  console.log('Target Exists?', !!exists);
}

main().finally(() => prisma.$disconnect());
