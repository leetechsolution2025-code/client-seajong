import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mfps = await prisma.manufacturedProduct.findMany();
  for (const mfp of mfps) {
    const inv = await prisma.inventoryItem.findFirst({ where: { tenHang: mfp.name } });
    if (inv) {
      console.log(`MFP ${mfp.name}: MFP stock = ${mfp.soLuong}, Inv stock = ${inv.soLuong}`);
    } else {
      console.log(`MFP ${mfp.name}: NOT FOUND in InventoryItem`);
    }
  }

  const mats = await prisma.materialItem.findMany();
  for (const mat of mats) {
    const inv = await prisma.inventoryItem.findFirst({ where: { code: mat.code } });
    if (inv) {
      console.log(`MAT ${mat.name}: MAT code = ${mat.code}, Inv stock = ${inv.soLuong}`);
    } else {
      console.log(`MAT ${mat.name}: NOT FOUND in InventoryItem`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
