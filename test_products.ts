import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.manufacturedProduct.findFirst({ where: { name: { contains: "Sen tắm nóng lạnh 01S" } } });
  console.log("Sen tắm warehouse:", m?.defaultWarehouse);

  const b = await prisma.inventoryItem.findFirst({ where: { tenHang: { contains: "Bồn tiểu nam" } } });
  console.log("Bồn tiểu nam warehouse (InventoryItem):", b?.defaultWarehouse);
  
  // Look up Product model
  const p = await prisma.product.findFirst({ where: { name: { contains: "Bồn tiểu nam" } } });
  console.log("Bồn tiểu nam warehouse (Product):", p?.defaultWarehouse);
}
main().catch(console.error).finally(() => prisma.$disconnect());
