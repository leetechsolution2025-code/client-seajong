const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.marketingYearlyPlan.findMany({
    include: {
      tasks: true,
      executionMonths: { include: { groups: { include: { tasks: true } } } }
    }
  });

  console.log("Total Plans:", plans.length);
  plans.forEach(p => {
    console.log(`Plan Year: ${p.year}, Status: ${p.status}`);
    console.log(` - Tasks: ${p.tasks.length}`);
    console.log(` - ExecutionMonths: ${p.executionMonths.length}`);
    p.executionMonths.forEach(em => {
       console.log(`   * Month: ${em.month}, TaskId: ${em.taskId}, Groups: ${em.groups.length}`);
       em.groups.forEach(g => {
           console.log(`     - Group: ${g.name}, Details: ${g.tasks.length}`);
       });
    });
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
