import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    where: { workEmail: 'nguyenlannhi@leetech.vn' },
  });
  console.log("Employee:", JSON.stringify(employee, null, 2));

  if (employee) {
    if (employee.manager) {
      const manager = await prisma.employee.findFirst({
        where: { code: employee.manager }
      });
      console.log("Manager:", manager?.fullName, manager?.userId);
    }

    if (employee.userId) {
      const approvals = await prisma.approvalRequest.findMany({
        where: { requestedById: employee.userId },
        orderBy: { createdAt: 'desc' },
        take: 2
      });
      console.log("Recent Approvals:", JSON.stringify(approvals, null, 2));
    } else {
      console.log("Employee does not have a userId.");
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
