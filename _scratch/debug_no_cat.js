const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.materialItem.create({
      data: {
        code: 'TEST-NO-CAT',
        name: 'Test No Category'
      }
    });
    console.log('Success:', res.id);
  } catch (e) {
    console.error('Failed:', e);
  }
}

main().finally(() => prisma.$disconnect());
