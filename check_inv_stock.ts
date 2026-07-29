import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    include: { stocks: true }
  });
  
  let issues = 0;
  for (const item of items) {
    const totalStock = item.stocks.reduce((sum, s) => sum + s.soLuong, 0);
    if (totalStock !== item.soLuong) {
      console.log(`Mismatch for ${item.code} (${item.tenHang}): Item.soLuong = ${item.soLuong}, Sum of InventoryStock = ${totalStock}`);
      issues++;
    }
  }
  console.log(`Found ${issues} mismatches between InventoryItem and InventoryStock.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
