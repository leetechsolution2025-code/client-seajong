import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({ where: { tenHang: { contains: "Sen tắm nóng lạnh 01S" } } });
  console.log("InventoryItem:", item);
  
  if (item) {
    const dm1 = await prisma.dinhMuc.findFirst({ where: { id: item.dinhMucId || "123" } });
    console.log("DinhMuc by dinhMucId:", dm1);
    
    // Check if there is a BOM that matches the code or name
    const dm2 = await prisma.dinhMuc.findFirst({ where: { tenSanPham: { contains: "Sen tắm nóng lạnh 01" } } });
    console.log("DinhMuc by Name:", dm2);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
