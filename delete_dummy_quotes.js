const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dummyQuotes = await prisma.quotation.findMany({
    where: { code: { startsWith: 'DH-' } },
    select: { id: true }
  });
  const ids = dummyQuotes.map(q => q.id);
  
  if (ids.length > 0) {
    await prisma.quotationItem.deleteMany({
      where: { quotationId: { in: ids } }
    });
    const result = await prisma.quotation.deleteMany({
      where: { id: { in: ids } }
    });
    console.log("Deleted dummy quotations:", result.count);
  } else {
    console.log("No dummy quotations found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
