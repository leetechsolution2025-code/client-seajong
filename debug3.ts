import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const qcs = await prisma.qualityInspection.findMany({
    select: { code: true, status: true, result: true }
  });
  console.log(qcs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
