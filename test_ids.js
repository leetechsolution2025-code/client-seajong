const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const so = await prisma.saleOrder.findUnique({ where: { id: "cms449nke014vgrr5yavjc0se" } });
  const contract = await prisma.contract.findUnique({ where: { id: "cms449nke014vgrr5yavjc0se" } });
  console.log("SO:", so);
  console.log("Contract:", contract);
}
main().finally(() => prisma.$disconnect());
