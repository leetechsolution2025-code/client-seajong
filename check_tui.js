const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tui = await prisma.materialItem.findFirst({ where: { name: { contains: "Túi vải sen vòi" } } });
  console.log("Túi vải sen vòi:", JSON.stringify(tui, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
