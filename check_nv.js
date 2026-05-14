const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const employees = await prisma.employee.findMany({
    where: { code: { startsWith: "NV" } },
    select: { id: true, code: true, fullName: true, status: true }
  });
  console.log("NV employees:", JSON.stringify(employees, null, 2));
  console.log("Total:", employees.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
