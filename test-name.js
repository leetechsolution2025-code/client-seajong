const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const genericTasks = await prisma.task.findMany({ where: { status: 'done' }, include: { assignee: true } });
  console.log("Generic done:", genericTasks.map(t => ({ id: t.id, assigneeName: t.assignee?.name })));

  const mktTasks = await prisma.marketingPlanTask.findMany({ where: { status: 'done' } });
  console.log("Mkt done:", mktTasks.map(t => ({ id: t.id, assigneeName: t.assigneeName })));

  const employees = await prisma.employee.findMany();
  console.log("Employees:", employees.map(e => e.fullName).filter(n => n.includes('Phượng')));
}
main().finally(() => prisma.$disconnect());
