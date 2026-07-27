const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inv = await prisma.inventoryItem.findFirst({ where: { code: 'TAY47' } });
  console.log("InventoryItem TAY47:", inv ? inv.maThayThe : "not found");

  const mat = await prisma.materialItem.findFirst({ where: { code: 'TAY47' } });
  console.log("MaterialItem TAY47:", mat ? mat.maThayThe : "not found");
}

run().finally(() => prisma.$disconnect());
