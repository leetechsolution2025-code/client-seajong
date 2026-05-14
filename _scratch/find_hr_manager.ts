import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hrStaff = await prisma.employee.findMany({
    where: {
      departmentName: { contains: "Nhân sự" }
    },
    select: { id: true, userId: true, fullName: true, position: true, departmentName: true }
  });
  console.log("HR Staff:", hrStaff);
  
  const anyStaff = await prisma.employee.findMany({
    where: {
      OR: [
        { position: { contains: "Trưởng phòng" } },
        { position: { contains: "HR" } }
      ]
    },
    select: { id: true, userId: true, fullName: true, position: true, departmentName: true }
  });
  console.log("Any staff with Trưởng phòng or HR in position:", anyStaff);
}
main().catch(console.error).finally(() => prisma.$disconnect());
