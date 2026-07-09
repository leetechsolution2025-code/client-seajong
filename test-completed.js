const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({ where: { status: 'done' } });
  console.log("Generic tasks done:", tasks.map(t => ({ id: t.id, title: t.title, assigneeId: t.assigneeId, dueDate: t.dueDate })));

  const mktTasks = await prisma.marketingPlanTask.findMany({ where: { status: 'done' }, include: { monthlyPlan: true } });
  console.log("Marketing tasks done:", mktTasks.map(t => ({ id: t.id, title: t.title, assigneeName: t.assigneeName, month: t.monthlyPlan?.month })));
}
main().finally(() => prisma.$disconnect());
