import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const khoChinhId = "cmoip699s0000i4almoh1zuqs";
  const kvpId = "cmoit7ttx0000i4514gkqzm1k";

  // Item in Kho Chinh
  const itemKhoChinh = await prisma.inventoryItem.findFirst({
    where: {
      stocks: { some: { warehouseId: khoChinhId } }
    },
    include: { stocks: true }
  });

  // Item in KVP
  const itemKVP = await prisma.inventoryItem.findFirst({
    where: {
      stocks: { some: { warehouseId: kvpId } }
    },
    include: { stocks: true }
  });

  console.log("=== ITEM IN KHO CHINH ===");
  console.log(JSON.stringify(itemKhoChinh, null, 2));
  
  console.log("\n=== ITEM IN KVP ===");
  console.log(JSON.stringify(itemKVP, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
