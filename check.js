const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const combo = await prisma.inventoryItem.findFirst({ where: { code: { contains: 'SJ-HH-COMBO-PHONG-TAM-18371' } } });
  console.log("Combo:", combo?.id, combo?.code);
  const sc = await prisma.inventoryItem.findFirst({ where: { code: 'SJ-SC-SC0079B' } });
  console.log("SC:", sc?.id, sc?.code);
}
run();
