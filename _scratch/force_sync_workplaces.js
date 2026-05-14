const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workplaces = await prisma.category.findMany({
    where: { type: 'dia_diem_lam_viec', isActive: true }
  });
  
  console.log(`Found ${workplaces.length} workplaces in categories.`);

  for (const wp of workplaces) {
    const existing = await prisma.branch.findFirst({
      where: { 
        OR: [
          { id: wp.id },
          { code: wp.code }
        ]
      }
    });

    if (!existing) {
      const created = await prisma.branch.create({
        data: {
          id: wp.id,
          code: wp.code,
          name: wp.name,
          address: wp.name, // Default to name
          clientId: 'default'
        }
      });
      console.log('Created branch for:', created.name);
    } else {
      console.log('Branch already exists for:', wp.name);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
