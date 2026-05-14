const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const root = await prisma.inventoryCategory.upsert({
    where: { code: 'VTSX' },
    update: {},
    create: { name: 'Vật tư sản xuất', code: 'VTSX' }
  });
  console.log('Root ID:', root.id);

  const cat = await prisma.inventoryCategory.findUnique({ where: { code: 'KCT' } });
  console.log('KCT Category:', cat);

  try {
    const res = await prisma.materialItem.create({
      data: {
        code: 'TEST-001',
        name: 'Test Material',
        categoryId: root.id
      }
    });
    console.log('Test Create Success:', res.id);
  } catch (e) {
    console.error('Test Create Failed:', e);
  }
}

main().finally(() => prisma.$disconnect());
