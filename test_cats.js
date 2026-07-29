const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({ where: { name: { contains: "Sen" }, type: "vat_tu_san_xuat" } });
  console.log(cats.map(c => c.name + " (" + c.code + ")"));
}
main().finally(() => prisma.$disconnect());
