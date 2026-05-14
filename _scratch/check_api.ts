import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.recruitmentRequest.findFirst();
  console.log("Recruitment:", r);
  const t = await prisma.trainingRequest.findFirst();
  console.log("Training:", t);
  const p = await (prisma as any).promotionRequest.findFirst({
    include: { employee: true }
  });
  console.log("Promotion:", p);
}
main().catch(console.error).finally(() => prisma.$disconnect());
