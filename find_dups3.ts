import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mat = await prisma.materialItem.findMany({ where: { name: { contains: "35s", mode: 'insensitive' } } });
  
  console.log("\nMAT (Kho Vat Tu):");
  mat.forEach(i => console.log(`- [${i.code}] ${i.name}`));
}

main().finally(() => prisma.$disconnect());
