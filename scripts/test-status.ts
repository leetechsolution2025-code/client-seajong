import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const t = await (prisma as any).logisticsTicket.findUnique({
    where: { code: "PK-20260809-1735" },
    select: { status: true, type: true }
  });
  console.log("PK-20260809-1735:", t);
}

main().catch(console.error).finally(() => prisma.$disconnect());
