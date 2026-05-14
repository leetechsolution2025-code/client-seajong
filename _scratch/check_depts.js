const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const depts = await prisma.departmentCategory.findMany();
  console.log("Departments in DepartmentCategory:", JSON.stringify(depts, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
