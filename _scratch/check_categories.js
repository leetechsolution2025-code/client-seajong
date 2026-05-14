const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.category.groupBy({
    by: ['type'],
    _count: {
      id: true
    }
  });
  console.log("Category types in DB:", JSON.stringify(types, null, 2));

  const samples = await prisma.category.findMany({
    take: 10,
    select: { type: true, name: true }
  });
  console.log("Sample categories:", JSON.stringify(samples, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
