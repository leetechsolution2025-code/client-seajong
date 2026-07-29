import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cat = await prisma.category.findUnique({
    where: { id: 'cmr8oir3b001i8ot086120ies' }
  });
  console.log("ERP Category of 01V:", cat);
}

main().catch(console.error).finally(() => prisma.$disconnect());
