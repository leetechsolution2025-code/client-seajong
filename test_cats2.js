const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({ where: { type: "vat_tu_san_xuat" } });
  const senTam = cats.find(c => c.name === "Sen tắm");
  const children = cats.filter(c => c.parentId === senTam.id);
  console.log("Children of Sen Tắm:", children.map(c => c.name));
  
  const items = await prisma.inventoryItem.findMany({
    where: { erpCategory: { code: { startsWith: senTam.code } } },
    select: { code: true }
  });
  console.log("Items with startsWith:", items.length);
}
main().finally(() => prisma.$disconnect());
