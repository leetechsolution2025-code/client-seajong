import { PrismaClient } from '@prisma/client';
import { syncCategoryToInventory } from '../src/lib/sync-utils';
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up stale thanh-pham and vat-tu from InventoryItem...");
  
  // Clean up relations first
  await prisma.inventoryStock.deleteMany({
    where: { inventoryItem: { loai: { in: ['thanh-pham', 'vat-tu'] } } }
  });
  await prisma.stockMovement.deleteMany({
    where: { inventoryItem: { loai: { in: ['thanh-pham', 'vat-tu'] } } }
  });
  
  // Delete the items
  await prisma.inventoryItem.deleteMany({
    where: { loai: { in: ['thanh-pham', 'vat-tu'] } }
  });
  
  console.log("Deleted stale items.");
  
  console.log("Syncing from ManufacturedProduct...");
  const mfps = await prisma.manufacturedProduct.findMany();
  for (const p of mfps) {
    if (!p.code) continue;
    const mappedCatId = await syncCategoryToInventory(p.productCategoryId);
    await prisma.inventoryItem.upsert({
      where: { code: p.code },
      update: {
        tenHang: p.name,
        loai: 'thanh-pham',
        donVi: p.unit || 'cái',
        giaNhap: 0,
        categoryId: mappedCatId
      },
      create: {
        code: p.code,
        tenHang: p.name,
        loai: 'thanh-pham',
        donVi: p.unit || 'cái',
        giaNhap: 0,
        trangThai: 'con-hang',
        categoryId: mappedCatId
      }
    });
  }
  console.log(`Synced ${mfps.length} ManufacturedProducts.`);

  console.log("Syncing from MaterialItem...");
  const mats = await prisma.materialItem.findMany();
  for (const m of mats) {
    if (!m.code) continue;
    const mappedCatId = await syncCategoryToInventory(m.categoryId);
    await prisma.inventoryItem.upsert({
      where: { code: m.code },
      update: {
        tenHang: m.name,
        loai: 'vat-tu',
        donVi: m.unit || 'cái',
        giaNhap: m.price || 0,
        categoryId: mappedCatId
      },
      create: {
        code: m.code,
        tenHang: m.name,
        loai: 'vat-tu',
        donVi: m.unit || 'cái',
        giaNhap: m.price || 0,
        trangThai: 'con-hang',
        categoryId: mappedCatId
      }
    });
  }
  console.log(`Synced ${mats.length} MaterialItems.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
