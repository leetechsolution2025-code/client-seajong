const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Create Main Categories
  const cat1 = await prisma.materialCategory.upsert({
    where: { code: 'TBHT' },
    update: {},
    create: { name: 'Thiết bị hoàn thiện', code: 'TBHT' }
  });
  const cat2 = await prisma.materialCategory.upsert({
    where: { code: 'VTLD' },
    update: {},
    create: { name: 'Vật tư lắp đặt', code: 'VTLD' }
  });
  const cat3 = await prisma.materialCategory.upsert({
    where: { code: 'PKLK' },
    update: {},
    create: { name: 'Phụ kiện & Linh kiện', code: 'PKLK' }
  });
  const cat4 = await prisma.materialCategory.upsert({
    where: { code: 'VTTH' },
    update: {},
    create: { name: 'Vật tư tiêu hao', code: 'VTTH' }
  });

  // 2. Create Sub Categories
  const subCats = [
    { name: 'Sen tắm & Vòi', code: 'STV', parentId: cat1.id },
    { name: 'Sứ vệ sinh', code: 'SVS', parentId: cat1.id },
    { name: 'Bồn rửa', code: 'BR', parentId: cat1.id },
    { name: 'Dây cấp & Van', code: 'DCV', parentId: cat2.id },
    { name: 'Bộ xả & Xi-phông', code: 'BXXP', parentId: cat2.id },
    { name: 'Giá đỡ & Cài', code: 'GDC', parentId: cat2.id },
    { name: 'Linh kiện thay thế', code: 'LKTT', parentId: cat3.id },
    { name: 'Ron & Đệm', code: 'RD', parentId: cat3.id },
    { name: 'Keo & Chất trám', code: 'KCT', parentId: cat4.id },
    { name: 'Bu lông & Ốc vít', code: 'BLOV', parentId: cat4.id },
  ];

  for (const sub of subCats) {
    await prisma.materialCategory.upsert({
      where: { code: sub.code },
      update: { parentId: sub.parentId },
      create: sub
    });
  }

  // 3. Create Material Items
  const items = [
    { code: 'BT-001', name: 'Băng tan (Cao su non)', catCode: 'KCT', unit: 'Cuộn', spec: '10m/cuộn', material: 'Nhựa' },
    { code: 'RS-21', name: 'Ron cao su phi 21', catCode: 'RD', unit: 'Cái', spec: 'Phi 21', material: 'Cao su đen' },
    { code: 'CS-DN', name: 'Chân sen tắm', catCode: 'STV', unit: 'Cặp', spec: 'Chân sen', material: 'Đồng mạ Chrome' },
    { code: 'DC-12', name: 'Dây cấp nước inox', catCode: 'DCV', unit: 'Sợi', spec: '40cm', material: 'Inox 304' },
    { code: 'LS-35', name: 'Lõi sen nóng lạnh', catCode: 'LKTT', unit: 'Cái', spec: 'Phi 35', material: 'Nhựa/Gốm' },
  ];

  for (const item of items) {
    const category = await prisma.materialCategory.findUnique({ where: { code: item.catCode } });
    if (category) {
      await prisma.materialItem.upsert({
        where: { code: item.code },
        update: { categoryId: category.id, unit: item.unit, spec: item.spec, material: item.material },
        create: {
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

  console.log('Seeding materials completed');
}

main().finally(() => prisma.$disconnect());
