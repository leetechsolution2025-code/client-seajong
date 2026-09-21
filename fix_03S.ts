import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stock = await prisma.inventoryStock.findUnique({
    where: { id: 'cmslf1zll0003ygngfmjbc3t8' } // 03S stock ID
  });
  
  if (stock) {
    await prisma.inventoryStock.update({
      where: { id: stock.id },
      data: { soLuongGiu: 0 }
    });
    console.log("Fixed 03S stock to 0");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
