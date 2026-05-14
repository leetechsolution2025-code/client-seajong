const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear old materials data
  await prisma.materialStock.deleteMany({});
  await prisma.materialItem.deleteMany({});
  console.log('Cleared old materials data');

  // 1. Create Root Category for Production Materials
  const root = await prisma.inventoryCategory.upsert({
    where: { code: 'VTSX' },
    update: {},
    create: { name: 'Vật tư sản xuất', code: 'VTSX' }
  });

  // 2. Create Main Categories under Root
  const cat1 = await prisma.inventoryCategory.upsert({
    where: { code: 'TBHT' },
    update: { parentId: root.id },
    create: { name: 'Thiết thiết bị hoàn thiện', code: 'TBHT', parentId: root.id }
  });
  const cat2 = await prisma.inventoryCategory.upsert({
    where: { code: 'VTLD' },
    update: { parentId: root.id },
    create: { name: 'Vật tư lắp đặt', code: 'VTLD', parentId: root.id }
  });
  const cat3 = await prisma.inventoryCategory.upsert({
    where: { code: 'PKLK' },
    update: { parentId: root.id },
    create: { name: 'Phụ kiện và linh kiện', code: 'PKLK', parentId: root.id }
  });
  const cat4 = await prisma.inventoryCategory.upsert({
    where: { code: 'VTTH' },
    update: { parentId: root.id },
    create: { name: 'Vật tư tiêu hao', code: 'VTTH', parentId: root.id }
  });

  // 3. Create Sub Categories
  const subCats = [
    { name: 'Sen tắm và vòi', code: 'STV', parentId: cat1.id },
    { name: 'Sứ vệ sinh', code: 'SVS', parentId: cat1.id },
    { name: 'Bồn rửa', code: 'BR', parentId: cat1.id },
    { name: 'Dây cấp và van', code: 'DCV', parentId: cat2.id },
    { name: 'Bộ xả và xi phông', code: 'BXXP', parentId: cat2.id },
    { name: 'Giá đỡ và cài', code: 'GDC', parentId: cat2.id },
    { name: 'Bu lông và ốc vít', code: 'BLOV', parentId: cat4.id },
    { name: 'Keo và chất trám', code: 'KCT', parentId: cat4.id },
  ];

  for (const sub of subCats) {
    await prisma.inventoryCategory.upsert({
      where: { code: sub.code },
      update: { parentId: sub.parentId },
      create: sub
    });
  }

  // 4. Create Material Items
  const items = [
    { code: 'BT-001', name: 'Băng tan (Cao su non)', catCode: 'KCT', unit: 'Cuộn', spec: '10m/cuộn', material: 'Nhựa' },
    { code: 'RS-21', name: 'Ron cao su phi 21', catCode: 'VTSX', unit: 'Cái', spec: 'Phi 21', material: 'Cao su đen' },
    { code: 'CS-DN', name: 'Chân sen tắm', catCode: 'STV', unit: 'Cặp', spec: 'Chân sen', material: 'Đồng mạ Chrome' },
    { code: 'DC-12', name: 'Dây cấp nước inox', catCode: 'DCV', unit: 'Sợi', spec: '40cm', material: 'Inox 304' },
    { code: 'LS-35', name: 'Lõi sen nóng lạnh', catCode: 'PKLK', unit: 'Cái', spec: 'Phi 35', material: 'Nhựa/Gốm' },
  ];

  for (const item of items) {
    const category = await prisma.inventoryCategory.findUnique({ where: { code: item.catCode } });
    if (category) {
      await prisma.materialItem.create({
        data: {
          code: item.code,
          name: item.name,
          unit: item.unit,
          spec: item.spec,
          material: item.material,
          categoryId: category.id
        }
      });
    }
  }

  console.log('Clean seeding materials completed');
}

main().finally(() => prisma.$disconnect());
