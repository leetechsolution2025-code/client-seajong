const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const whs = await prisma.warehouse.findMany();
  console.log("=== WAREHOUSES ===");
  whs.forEach(w => {
    console.log(`${w.name}: id=${w.id}, code=${w.code}, type=${w.type}, isActive=${w.isActive}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
