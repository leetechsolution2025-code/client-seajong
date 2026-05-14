import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const branches = await (prisma as any).branch.findMany({ include: { subnets: true } });
  console.log("BRANCHES:", JSON.stringify(branches, null, 2));

  const emp = await (prisma as any).employee.findFirst({
    where: { fullName: { contains: "Lê Công Vụ" } }
  });
  console.log("EMPLOYEE:", JSON.stringify(emp, null, 2));
  
  await prisma.$disconnect();
}

main();
