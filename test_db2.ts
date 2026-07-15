import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({ where: { tenHang: { contains: "Sen tắm nóng lạnh 01S" } } });
  console.log("InventoryItem by Name:", item);
  
  const dm = await prisma.dinhMuc.findFirst({ where: { tenSanPham: { contains: "Sen tắm nóng lạnh 01S" } } });
  console.log("DinhMuc by Name:", dm);
}
main().catch(console.error).finally(() => prisma.$disconnect());
