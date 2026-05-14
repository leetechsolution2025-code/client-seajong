import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const notifs = await prisma.notification.findMany({ take: 1, orderBy: { createdAt: 'desc' } });
  console.log("Recent Notification:", notifs[0]);
}
main().catch(console.error).finally(() => prisma.$disconnect());
