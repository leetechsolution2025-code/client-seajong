const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: '01S' },
    include: { dinhMucs: true }
  });
  console.log(JSON.stringify(item, null, 2));
}
run();
