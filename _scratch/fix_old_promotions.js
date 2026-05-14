const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const firstAdmin = await prisma.employee.findFirst({
    where: { position: { contains: 'Giám đốc' } }
  }) || await prisma.employee.findFirst();

  if (!firstAdmin) {
    console.log("No employees found.");
    return;
  }

  const result = await prisma.promotionRequest.updateMany({
    where: { requesterId: null },
    data: { requesterId: firstAdmin.id }
  });

  console.log(`Updated ${result.count} records with requesterId: ${firstAdmin.id} (${firstAdmin.fullName})`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
