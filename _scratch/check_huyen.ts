import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const huyen = await prisma.employee.findFirst({
    where: { fullName: { contains: "Huyền" } },
    select: { id: true, userId: true, fullName: true, position: true, departmentName: true }
  });
  console.log("Huyền:", huyen);
}
main().catch(console.error).finally(() => prisma.$disconnect());
