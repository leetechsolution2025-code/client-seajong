const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { code: { in: ["PK10", "PK0106G", "PK04"] } },
    include: { erpCategory: true }
  });
  console.log(items.map(i => i.code + " -> " + i.erpCategory?.code));
}
main().finally(() => prisma.$disconnect());
