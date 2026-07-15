import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.manufacturedProduct.findFirst({ where: { name: { contains: "Sen tắm nóng lạnh 01S" } } });
  console.log("ManufacturedProduct:", m?.id);
  if (m) {
    const dm = await prisma.dinhMuc.findFirst({ where: { manufacturedProductId: m.id } });
    console.log("DinhMuc:", dm?.id);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
