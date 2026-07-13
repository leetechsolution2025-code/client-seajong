const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.materialItem.findMany();
  fs.writeFileSync('material_data_export.json', JSON.stringify(materials, null, 2));
  console.log(`Exported ${materials.length} material items to material_data_export.json`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
