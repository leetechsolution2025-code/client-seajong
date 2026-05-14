import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const branches = await prisma.branch.findMany();
    console.log("Branches in DB:", JSON.stringify(branches, null, 2));
    
    const employees = await prisma.employee.findMany({
        take: 5,
        select: { id: true, fullName: true, branchCode: true }
    });
    console.log("Sample Employees:", JSON.stringify(employees, null, 2));
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
