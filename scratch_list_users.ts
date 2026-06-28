import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      employee: true
    }
  });

  console.log(`Found ${users.length} users in database:`);
  users.forEach((u: any) => {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
    if (u.employee) {
      console.log(`  Employee Code: ${u.employee.code}, DeptCode: ${u.employee.departmentCode}, Position: ${u.employee.position}, Level: ${u.employee.level}`);
    } else {
      console.log(`  No linked Employee record`);
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
