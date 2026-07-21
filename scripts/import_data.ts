import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('/root/seajong/sync_data.json', 'utf8'));
  
  console.log("Deleting old data...");
  
  await prisma.dinhMucVatTu.deleteMany();
  await prisma.dinhMuc.deleteMany();
  
  await prisma.inventoryStock.deleteMany({
    where: { inventoryItem: { loai: { in: ['thanh-pham', 'vat-tu'] } } }
  });
  await prisma.stockMovement.deleteMany({
    where: { inventoryItem: { loai: { in: ['thanh-pham', 'vat-tu'] } } }
  });
  await prisma.inventoryItem.deleteMany({
    where: { loai: { in: ['thanh-pham', 'vat-tu'] } }
  });
  
  await prisma.manufacturedProduct.deleteMany();
  await (prisma as any).materialItem.deleteMany();
  
  await prisma.category.deleteMany({
    where: { type: { in: ['danh_muc_thanh_pham', 'vat_tu_san_xuat'] } }
  });
  
  console.log("Inserting new data...");
  await prisma.category.createMany({ data: data.Category });
  
  for (const cat of data.InventoryCategory) {
    if (cat.code) {
      const existing = await prisma.inventoryCategory.findFirst({ where: { code: cat.code } });
      if (existing && existing.id !== cat.id) {
        // Need to delete or update the conflicting one. Let's delete it so we can upsert with our ID
        // But wait, if it has children, deleting it will fail.
        // Let's just update the ID? SQLite doesn't let you update Primary Key easily if there are FKs.
        try {
          await prisma.inventoryCategory.delete({ where: { id: existing.id } });
        } catch(e) {}
      }
    }
    await prisma.inventoryCategory.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat
    });
  }

  await (prisma as any).materialItem.createMany({ data: data.MaterialItem });
  await prisma.manufacturedProduct.createMany({ data: data.ManufacturedProduct });
  await prisma.dinhMuc.createMany({ data: data.DinhMuc });
  await prisma.dinhMucVatTu.createMany({ data: data.DinhMucVatTu });
  for (const item of data.InventoryItem) {
    if (!item.code) continue;
    await prisma.inventoryItem.upsert({
      where: { code: item.code },
      update: {
        tenHang: item.tenHang,
        loai: item.loai,
        donVi: item.donVi,
        giaNhap: item.giaNhap,
        giaBan: item.giaBan,
        categoryId: item.categoryId
      },
      create: item
    });
  }

  console.log("Import completed!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
