import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.attendance.count();
  console.log('Total Attendance records:', count);
  
  if (count > 0) {
    const latest = await prisma.attendance.findMany({
      take: 5,
      orderBy: { date: 'desc' }
    });
    console.log('Latest 5 records:', JSON.stringify(latest, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
