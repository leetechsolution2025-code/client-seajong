const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p1 = await prisma.seajongProduct.findFirst({ where: { name: { contains: 'BT001' } } });
  const p2 = await prisma.seajongProduct.findFirst({ where: { name: { contains: 'BT002' } } });
  const p3 = await prisma.seajongProduct.findFirst({ where: { name: { contains: 'BT003' } } });
  
  if (p1) console.log(p1.name);
  if (p2) console.log(p2.name);
  if (p3) console.log(p3.name);
}
main().finally(() => prisma.$disconnect());
