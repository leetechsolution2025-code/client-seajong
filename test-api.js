const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.task.findFirst({ where: { status: 'done' } });
  if (t) {
    const u = await prisma.user.findUnique({ where: { id: t.assigneeId } });
    console.log("Done task user name:", u ? u.name : null);
  }
}
main().finally(() => prisma.$disconnect());
