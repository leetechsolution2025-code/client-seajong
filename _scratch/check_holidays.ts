import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const policies = await prisma.laborPolicy.findMany({
    where: { type: 'holiday_regulation' }
  });
  console.log('Holiday Policies:', JSON.stringify(policies, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
