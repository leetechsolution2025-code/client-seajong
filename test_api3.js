const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.product.findFirst({
    where: { id: 19664 }
  });
  console.log(item);
}
main().finally(() => prisma.$disconnect());
