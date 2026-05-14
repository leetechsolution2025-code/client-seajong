import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const recruitments = await prisma.recruitmentRequest.findMany({ take: 2 });
  const trainings = await prisma.trainingRequest.findMany({ take: 2 });
  const promotions = await (prisma as any).promotionRequest.findMany({ take: 2 });
  console.log("Recruitments:", recruitments);
  console.log("Trainings:", trainings);
  console.log("Promotions:", promotions);
}
main().catch(console.error).finally(() => prisma.$disconnect());
