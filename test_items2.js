const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { code: { in: ["CX07", "HVX20", "TUZ08"] } },
    include: { erpCategory: true }
  });
  console.log(items.map(i => i.code + " -> " + i.erpCategory?.code));
}
main().finally(() => prisma.$disconnect());
