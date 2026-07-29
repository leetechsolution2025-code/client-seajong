import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mats = await prisma.materialItem.findMany({
    include: { stocks: true }
  });
  
  let issues = 0;
  for (const mat of mats) {
    const totalMatStock = mat.stocks.reduce((sum, s) => sum + s.soLuong, 0);
    const inv = await prisma.inventoryItem.findFirst({ where: { code: mat.code } });
    if (inv) {
      if (inv.soLuong !== totalMatStock) {
        console.log(`Mismatch for MAT ${mat.code}: MaterialStock total = ${totalMatStock}, InventoryItem.soLuong = ${inv.soLuong}`);
        issues++;
      }
    }
  }
  console.log(`Found ${issues} mismatches between MaterialStock and InventoryItem.`);

  const mfps = await prisma.manufacturedProduct.findMany();
  let mfpIssues = 0;
  for (const mfp of mfps) {
    const inv = await prisma.inventoryItem.findFirst({ where: { tenHang: mfp.name } });
    if (inv) {
      if (inv.soLuong !== mfp.soLuong) {
        console.log(`Mismatch for MFP ${mfp.name}: ManufacturedProduct.soLuong = ${mfp.soLuong}, InventoryItem.soLuong = ${inv.soLuong}`);
        mfpIssues++;
      }
    }
  }
  console.log(`Found ${mfpIssues} mismatches between ManufacturedProduct and InventoryItem.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
