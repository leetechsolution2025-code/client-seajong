import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.manufacturedProduct.findFirst({ where: { name: { contains: "Sen tắm nóng lạnh 01S" } } });
  console.log("ManufacturedProduct:", m);
  const c = await prisma.productCombo.findFirst({ where: { name: { contains: "Combo" } } });
  console.log("ProductCombo:", c);
  const p = await prisma.product.findFirst({ where: { name: { contains: "Sen tắm nóng lạnh 01S" } } });
  console.log("Product:", p);
}
main().catch(console.error).finally(() => prisma.$disconnect());
