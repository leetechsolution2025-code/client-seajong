const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({ where: { tenHang: 'Combo phòng tắm cao cấp Seajong – Refined Living' } });
  console.log(item);
}
main().catch(console.error).finally(() => prisma.$disconnect());
