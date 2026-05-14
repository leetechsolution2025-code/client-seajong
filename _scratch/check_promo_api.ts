import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const reqs = await (prisma as any).promotionRequest.findMany({ take: 1, include: { employee: true } });
  console.log("DB returned:", reqs[0]);
}
main().catch(console.error).finally(() => prisma.$disconnect());
