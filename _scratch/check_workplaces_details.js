const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { type: 'dia_diem_lam_viec' }
  });
  console.log('Workplace Categories Details:', cats);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
