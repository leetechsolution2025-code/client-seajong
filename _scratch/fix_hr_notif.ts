import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const hrManagers = await prisma.employee.findMany({
      where: {
        OR: [
          { position: { contains: "Trưởng phòng Nhân sự" } },
          { position: "TPNS" },
          { 
            AND: [
              { departmentName: { contains: "Nhân sự" } },
              { 
                OR: [
                  { position: { contains: "Trưởng phòng" } },
                  { position: "vtr-20260401-1964-sbmg" }
                ]
              }
            ]
          }
        ]
      },
      select: { userId: true, fullName: true }
    });
    console.log("Found HR Managers:", hrManagers);
}
main().catch(console.error).finally(() => prisma.$disconnect());
