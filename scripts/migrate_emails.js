const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Migration started...");
  
  // 1. Update Employees
  const employees = await prisma.employee.findMany({
    where: { workEmail: { endsWith: '@seajong.vn' } }
  });
  console.log(`Found ${employees.length} employees to update.`);
  for (const emp of employees) {
    const newEmail = emp.workEmail.replace('@seajong.vn', '@seajong.com');
    await prisma.employee.update({
      where: { id: emp.id },
      data: { workEmail: newEmail }
    });
    console.log(`Updated Employee: ${emp.workEmail} -> ${newEmail}`);
  }

  // 2. Update Users
  const users = await prisma.user.findMany({
    where: { email: { endsWith: '@seajong.vn' } }
  });
  console.log(`Found ${users.length} users to update.`);
  for (const user of users) {
    const newEmail = user.email.replace('@seajong.vn', '@seajong.com');
    await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail }
    });
    console.log(`Updated User: ${user.email} -> ${newEmail}`);
  }

  // 3. Update CompanyInfo
  const companies = await prisma.companyInfo.findMany({
    where: { email: { endsWith: '.vn' } }
  });
  for (const c of companies) {
    if (c.email) {
      const newEmail = c.email.replace('.vn', '.com');
      await prisma.companyInfo.update({
        where: { id: c.id },
        data: { email: newEmail }
      });
      console.log(`Updated CompanyInfo: ${c.email} -> ${newEmail}`);
    }
  }

  console.log("Migration complete.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
