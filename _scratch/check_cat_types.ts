import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.category.findMany({
    select: { type: true },
    distinct: ['type']
  });
  console.log('Category Types:', types);
  
  const statusCats = await prisma.category.findMany({
    where: { OR: [{ type: 'trang_thai_chi_phi' }, { type: 'expense_status' }] }
  });
  console.log('Status Categories:', statusCats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
