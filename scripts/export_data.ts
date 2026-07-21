import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("Exporting tables...");
  const data = {
    Category: await prisma.category.findMany({
      where: { type: { in: ['danh_muc_thanh_pham', 'vat_tu_san_xuat'] } }
    }),
    InventoryCategory: await prisma.inventoryCategory.findMany(),
    MaterialItem: (await (prisma as any).materialItem.findMany()).map((item: any) => ({
      ...item,
      price: Number(item.price),
      giaBan: Number(item.giaBan)
    })),
    ManufacturedProduct: await prisma.manufacturedProduct.findMany(),
    DinhMuc: await prisma.dinhMuc.findMany(),
    DinhMucVatTu: (await prisma.dinhMucVatTu.findMany()).map((item: any) => ({
      ...item,
      soLuong: Number(item.soLuong)
    })),
    InventoryItem: (await prisma.inventoryItem.findMany({
      where: { loai: { in: ['thanh-pham', 'vat-tu'] } }
    })).map((item: any) => ({
      ...item,
      soLuong: Number(item.soLuong),
      soLuongMin: Number(item.soLuongMin),
      giaNhap: Number(item.giaNhap),
      giaBan: Number(item.giaBan)
    }))
  };

  fs.writeFileSync('sync_data.json', JSON.stringify(data, null, 2));
  console.log("Exported to sync_data.json");
}
main().catch(console.error).finally(() => prisma.$disconnect());
