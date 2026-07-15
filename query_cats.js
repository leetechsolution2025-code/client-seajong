const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.inventoryCategory.findMany();
  console.log("Total InventoryCategories:", cats.length);
  
  const roots = cats.filter(c => c.parentId === null);
  console.log("Root categories (parentId = null):");
  roots.forEach(r => console.log(`- ${r.code} (${r.name}) [ID: ${r.id}]`));
  
  const spVesinh = cats.find(c => c.code === 'SP_VESINH');
  console.log("\nSP_VESINH exists:", !!spVesinh);
  if (spVesinh) {
      console.log("SP_VESINH parentId:", spVesinh.parentId);
  }
  
  const spThanhPham = cats.find(c => c.code === 'SP_THANH_PHAM');
  console.log("SP_THANH_PHAM exists:", !!spThanhPham);
  
  const client = await prisma.client.findFirst({ include: { industry: true } });
  console.log("\nActive industry:", client?.industry?.code);
}

main().catch(console.error).finally(() => prisma.$disconnect());
