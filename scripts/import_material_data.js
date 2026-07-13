const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '..', 'material_data_export.json');
  if (!fs.existsSync(filePath)) {
    console.log('No material_data_export.json found. Skipping material data sync.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Found ${data.length} material items to sync.`);
  
  let updated = 0;
  let inserted = 0;

  for (const item of data) {
    const existing = await prisma.materialItem.findUnique({ where: { id: item.id } });
    if (existing) {
      await prisma.materialItem.update({
        where: { id: item.id },
        data: {
          giaNhap: item.giaNhap,
          giaBan: item.giaBan,
          code: item.code,
          tenHang: item.tenHang,
          categoryId: item.categoryId,
          // update other fields if needed, but mainly we want prices
          thongSoKyThuat: item.thongSoKyThuat,
          donVi: item.donVi,
          spec: item.spec,
        }
      });
      updated++;
    } else {
      await prisma.materialItem.create({
        data: item
      });
      inserted++;
    }
  }
  
  console.log(`Material sync complete. Updated: ${updated}, Inserted: ${inserted}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
