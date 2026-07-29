const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const workbook = XLSX.readFile('danh_sach_vat_tu_thieu.xlsx');
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const categories = await prisma.category.findMany();
  const categoryMap = new Map();
  categories.forEach(c => categoryMap.set(c.code.toLowerCase(), c.id));

  let updatedCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    
    const sku = row[0].toString().trim();
    const catCode = (row[3] || '').toString().trim().toLowerCase();
    
    if (catCode && categoryMap.has(catCode)) {
      const catId = categoryMap.get(catCode);
      const res = await prisma.inventoryItem.updateMany({
        where: { code: sku },
        data: { erpCategoryId: catId }
      });
      updatedCount += res.count;
    }
  }
  console.log('Updated ' + updatedCount + ' items');
  await prisma.$disconnect();
}
run();
