const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.warehouse.upsert({
    where: { code: 'KHO-HANGHOA' },
    update: { name: 'Kho hàng hoá (Seajong)', type: 'SEAJONG' },
    create: {
      code: 'KHO-HANGHOA',
      name: 'Kho hàng hoá (Seajong)',
      type: 'SEAJONG',
      address: 'Trụ sở chính',
      isActive: true,
    }
  });

  await prisma.warehouse.upsert({
    where: { code: 'KHO-THANHPHAM' },
    update: { name: 'Kho thành phẩm', type: 'PRODUCT' },
    create: {
      code: 'KHO-THANHPHAM',
      name: 'Kho thành phẩm',
      type: 'PRODUCT',
      isActive: true,
    }
  });

  await prisma.warehouse.upsert({
    where: { code: 'KHO-PHUKIEN' },
    update: { name: 'Kho vật tư phụ kiện', type: 'MATERIAL' },
    create: {
      code: 'KHO-PHUKIEN',
      name: 'Kho vật tư phụ kiện',
      type: 'MATERIAL',
      isActive: true,
    }
  });

  await prisma.warehouse.upsert({
    where: { code: 'KHO-LOI' },
    update: { name: 'Kho hàng lỗi', type: 'DEFECT' },
    create: {
      code: 'KHO-LOI',
      name: 'Kho hàng lỗi',
      type: 'DEFECT',
      isActive: true,
    }
  });

  console.log("Warehouses synced.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
