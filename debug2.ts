import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const qc = await prisma.qualityInspection.findUnique({
    where: { code: 'QC-20260730-123' }
  });
  console.log(qc);
}

main().catch(console.error).finally(() => prisma.$disconnect());
